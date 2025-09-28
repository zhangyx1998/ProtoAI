#include <esp_log.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <sdkconfig.h>
#include <stdint.h>

#include <tinyusb.h>
#include <tinyusb_cdc_acm.h>
#include <tinyusb_default_config.h> // NEW: for TINYUSB_DEFAULT_CONFIG()

#include "driver/gpio.h"
#include "pinout.h"

#include "freertos/timers.h"

#define TRAFFIC_PULSE_MS 40

static TimerHandle_t s_led_off_tmr = nullptr;

static void led_off_cb(TimerHandle_t) { gpio_set_level(LED_BUILTIN, 0); }

static inline void traffic_pulse_now(void) {
  gpio_set_level(LED_BUILTIN, 1);
  xTimerStop(s_led_off_tmr, 0);
  xTimerChangePeriod(s_led_off_tmr, pdMS_TO_TICKS(TRAFFIC_PULSE_MS), 0);
  xTimerStart(s_led_off_tmr, 0);
}

extern "C" {
#include "tusb.h"
}

// ---------- Device + String Descriptors ----------
extern "C" {

// Device descriptor (identity)
static tusb_desc_device_t dev_desc = {.bLength = sizeof(tusb_desc_device_t),
                                      .bDescriptorType = TUSB_DESC_DEVICE,
                                      .bcdUSB = 0x0200, // USB 2.0
                                      .bDeviceClass =
                                          TUSB_CLASS_MISC, // composite
                                      .bDeviceSubClass = MISC_SUBCLASS_COMMON,
                                      .bDeviceProtocol = MISC_PROTOCOL_IAD,
                                      .bMaxPacketSize0 = CFG_TUD_ENDPOINT0_SIZE,

                                      .idVendor = 0x0483,  // VID
                                      .idProduct = 0x5740, // PID
                                      .bcdDevice = 0x0100, // device rev

                                      .iManufacturer = 0x01, // "ProtoAI"
                                      .iProduct = 0x02,      // "Dual_LoopBack"
                                      .iSerialNumber = 0x03, // "PAI-0001"

                                      .bNumConfigurations = 0x01};

uint8_t const *tud_descriptor_device_cb(void) {
  return reinterpret_cast<uint8_t const *>(&dev_desc);
}

// String table:
// 0: LangID, 1: Manufacturer, 2: Product, 3: Serial, 4: CDC0 name, 5: CDC1 name
static const char *const USB_STR[] = {
    (const char[]){0x09, 0x04}, // 0: English (US) 0x0409
    "ProtoAI",                  // 1
    "Dual_LoopBack",            // 2
    "ProtocolTranslator",       // 3
    "DUO(OPEN)",                // 4  (interface name)
    "DUAL_LOOPBACK(PRIVATE)",   // 5  (interface name)
};

uint16_t const *tud_descriptor_string_cb(uint8_t index, uint16_t langid) {
  (void)langid;
  static uint16_t desc[32];
  uint8_t n = 0;

  if (index == 0) {
    // Return supported language(s)
    desc[0] = (uint16_t)((TUSB_DESC_STRING << 8) | (2 + 2));
    memcpy(&desc[1], USB_STR[0], 2);
    return desc;
  }

  if (index >= (sizeof(USB_STR) / sizeof(USB_STR[0])))
    return nullptr;

  const char *s = USB_STR[index];
  while (s[n] && n < 31) {
    desc[1 + n] = (uint8_t)s[n];
    n++;
  }
  desc[0] = (uint16_t)((TUSB_DESC_STRING << 8) | (2 + n * 2));
  return desc;
}
}
extern "C" {

// Interface numbers
enum {
  ITF_CDC0_COMM = 0,
  ITF_CDC0_DATA,
  ITF_CDC1_COMM,
  ITF_CDC1_DATA,
  ITF_TOTAL
};

// Endpoint sizes (Full Speed)
#define BULK_SZ 64
#define INT_SZ 16

// Unique EP addresses (change if you add other USB classes)
#define EP_CDC0_NOTIF 0x81
#define EP_CDC0_OUT 0x01
#define EP_CDC0_IN 0x82

#define EP_CDC1_NOTIF 0x83
#define EP_CDC1_OUT 0x03
#define EP_CDC1_IN 0x84

#define CFG_TOTAL_LEN (TUD_CONFIG_DESC_LEN + TUD_CDC_DESC_LEN * 2)

// TUD CDC Descriptors function
static uint8_t const cfg_desc[] = {
    TUD_CONFIG_DESCRIPTOR(1, ITF_TOTAL, 0 /* iConfiguration */, CFG_TOTAL_LEN,
                          TUSB_DESC_CONFIG_ATT_REMOTE_WAKEUP, 100),

    // CDC0 — iInterface = 4  => "CDC0"
    TUD_CDC_DESCRIPTOR(ITF_CDC0_COMM, 4, EP_CDC0_NOTIF, INT_SZ, EP_CDC0_OUT,
                       EP_CDC0_IN, BULK_SZ),

    // CDC1 — iInterface = 5  => "CDC1"
    TUD_CDC_DESCRIPTOR(ITF_CDC1_COMM, 5, EP_CDC1_NOTIF, INT_SZ, EP_CDC1_OUT,
                       EP_CDC1_IN, BULK_SZ),
};

uint8_t const *tud_descriptor_configuration_cb(uint8_t index) {
  (void)index;
  return cfg_desc;
}

} // extern "C"

static const char *TAG = "example";
// Local stack buffer

#define ITF(val) static_cast<tinyusb_cdcacm_itf_t>(val)

// Blink task
// static void blink_task(void *pvParameter) {
//   auto pin = (gpio_num_t)(uintptr_t)pvParameter;
//   gpio_reset_pin(pin);
//   gpio_set_direction(pin, GPIO_MODE_OUTPUT);
//   unsigned state = 0;
//   while (1) {
//     gpio_set_level(pin, state);
//     state = !state;
//     vTaskDelay(pdMS_TO_TICKS(1000)); // 1 second delay
//   }
// }

// --- Bidirectional bridge helper ---
// forward from src_itf -> dst_itf
static void forward_bytes_between_cdc(tinyusb_cdcacm_itf_t src_itf,
                                      tinyusb_cdcacm_itf_t dst_itf) {
#if (CONFIG_TINYUSB_CDC_COUNT > 1)
  uint8_t local[CONFIG_TINYUSB_CDC_RX_BUFSIZE];
  size_t rx_size = 0;

  esp_err_t ret = tinyusb_cdcacm_read(src_itf, local, sizeof(local), &rx_size);
  if (ret == ESP_OK && rx_size > 0) {
    ESP_LOGI(TAG, "Forward %u bytes: itf%d -> itf%d", (unsigned)rx_size,
             (int)src_itf, (int)dst_itf);
    ESP_LOG_BUFFER_HEXDUMP(TAG, local, rx_size, ESP_LOG_DEBUG);

    // write to the OTHER interface
    (void)tinyusb_cdcacm_write_queue(dst_itf, local, rx_size);
    (void)tinyusb_cdcacm_write_flush(dst_itf, 0);
    traffic_pulse_now(); // blink LED on traffic
  } else if (ret != ESP_OK) {
    ESP_LOGE(TAG, "CDC read error on itf%d: %s", (int)src_itf,
             esp_err_to_name(ret));
  }
#else
  // If only one CDC present, just read & echo (fallback)
  uint8_t local[CONFIG_TINYUSB_CDC_RX_BUFSIZE];
  size_t rx_size = 0;
  esp_err_t ret = tinyusb_cdcacm_read(src_itf, local, sizeof(local), &rx_size);
  if (ret == ESP_OK && rx_size > 0) {
    ESP_LOGI(TAG, "Echo %u bytes on itf%d", (unsigned)rx_size, (int)src_itf);
    (void)tinyusb_cdcacm_write_queue(src_itf, local, rx_size);
    (void)tinyusb_cdcacm_write_flush(src_itf, 0);
  }
#endif
}

static void tinyusb_cdc_rx_callback(int itf, cdcacm_event_t *event) {
  (void)event;

  // --- ORIGINAL echo path (kept, but commented out) ---
  // size_t rx_size = 0;
  // esp_err_t ret = tinyusb_cdcacm_read(ITF(itf), buf,
  //                                     CONFIG_TINYUSB_CDC_RX_BUFSIZE,
  //                                     &rx_size);
  // if (ret == ESP_OK && rx_size > 0) {
  //   ESP_LOGI(TAG, "Data from channel %d (len=%u):", itf, (unsigned)rx_size);
  //   ESP_LOG_BUFFER_HEXDUMP(TAG, buf, rx_size, ESP_LOG_INFO);
  //
  //   // echo back
  //   tinyusb_cdcacm_write_queue(ITF(itf), buf, rx_size);
  //   tinyusb_cdcacm_write_flush(ITF(itf), 0);
  // } else if (ret != ESP_OK) {
  //   ESP_LOGE(TAG, "CDC read error: %s", esp_err_to_name(ret));
  // }

  // --- NEW bidirectional forwarding ---
#if (CONFIG_TINYUSB_CDC_COUNT > 1)
  // if data arrives on 0, forward to 1; if on 1, forward to 0
  if (itf == (int)TINYUSB_CDC_ACM_0) {
    forward_bytes_between_cdc(TINYUSB_CDC_ACM_0, TINYUSB_CDC_ACM_1);
  } else if (itf == (int)TINYUSB_CDC_ACM_1) {
    forward_bytes_between_cdc(TINYUSB_CDC_ACM_1, TINYUSB_CDC_ACM_0);
  } else {
    // safety: for any other ports, just echo (shouldn't happen unless >2 CDCs)
    forward_bytes_between_cdc(ITF(itf), ITF(itf));
  }
#else
  // one-port fallback: behave like echo
  forward_bytes_between_cdc(ITF(itf), ITF(itf));
#endif
}

// Quality of life: log the descriptors on init
static void device_event_handler(tinyusb_event_t *event, void *arg) {
  (void)arg;
  switch (event->id) {
  case TINYUSB_EVENT_ATTACHED:
    ESP_LOGI(TAG, "USB attached");
    break;
  case TINYUSB_EVENT_DETACHED:
    ESP_LOGI(TAG, "USB detached");
    break;
  default:
    break;
  }
}

extern "C" void app_main(void) {
  // Two blinking LEDs
  // xTaskCreate(blink_task, "blink_task0", configMINIMAL_STACK_SIZE * 2,
  //             (void *)LED_BUILTIN, 5, NULL);
  // xTaskCreate(blink_task, "blink_task1", configMINIMAL_STACK_SIZE * 2,
  //             (void *)LED_GREEN, 5, NULL);

  // --- TinyUSB 2.0 style device install ---
  tinyusb_config_t tusb_cfg = TINYUSB_DEFAULT_CONFIG(
      device_event_handler /* optional */, NULL /* user arg */);

  // (custom descriptors can be plugged here if needed)

  ESP_ERROR_CHECK(tinyusb_driver_install(&tusb_cfg));

  // --- CDC-ACM init (no usb_dev field anymore) ---
  tinyusb_config_cdcacm_t acm_cfg = {
      .cdc_port = TINYUSB_CDC_ACM_0,
      .callback_rx = &tinyusb_cdc_rx_callback,
      .callback_rx_wanted_char = NULL,
      .callback_line_state_changed = NULL,
      .callback_line_coding_changed = NULL,
  };

  gpio_reset_pin(LED_BUILTIN);
  gpio_set_direction(LED_BUILTIN, GPIO_MODE_OUTPUT);
  gpio_set_level(LED_BUILTIN, 0);
  s_led_off_tmr = xTimerCreate("ledOff", pdMS_TO_TICKS(TRAFFIC_PULSE_MS),
                               pdFALSE, nullptr, led_off_cb);

  ESP_ERROR_CHECK(tinyusb_cdcacm_init(&acm_cfg));

#if (CONFIG_TINYUSB_CDC_COUNT > 1)
  acm_cfg.cdc_port = TINYUSB_CDC_ACM_1;
  ESP_ERROR_CHECK(tinyusb_cdcacm_init(&acm_cfg));
#endif
}

// --- DFU Runtime support ---
#include "esp_system.h"
#include "soc/rtc.h"          // REG_WRITE()
#include "soc/rtc_cntl_reg.h" // RTC_CNTL_OPTION1_REG, RTC_CNTL_FORCE_DOWNLOAD_BOOT

// TinyUSB DFU Runtime: host sent DFU_DETACH, switch to bootloader
void tud_dfu_runtime_reboot_to_dfu_cb(void) {
  // Request ROM download (USB/UART0), then reboot to ROM bootloader (DFU/serial
  // download)
  REG_WRITE(RTC_CNTL_OPTION1_REG, RTC_CNTL_FORCE_DOWNLOAD_BOOT);
  esp_restart();
}
