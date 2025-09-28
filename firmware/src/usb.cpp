#include <tinyusb.h>

tusb_desc_device_t custom_device_desc = {
    .bLength = sizeof(tusb_desc_device_t),
    .bDescriptorType = TUSB_DESC_DEVICE,
    .bcdUSB = 0x0200, // USB 2.0
    .bDeviceClass = TUSB_CLASS_MISC,
    .bDeviceSubClass = MISC_SUBCLASS_COMMON,
    .bDeviceProtocol = MISC_PROTOCOL_IAD,
    .bMaxPacketSize0 = CFG_TUD_ENDPOINT0_SIZE,

    .idVendor = 0x303A,  // Espressif's VID
    .idProduct = 0x4001, // Custom PID
    .bcdDevice = 0x0100, // Device release number in BCD

    .iManufacturer = 0x01, // Index of manufacturer string descriptor
    .iProduct = 0x02,      // Index of product string descriptor
    .iSerialNumber = 0x03, // Index of serial number string descriptor

    .bNumConfigurations = 0x01 // Number of possible configurations
};
