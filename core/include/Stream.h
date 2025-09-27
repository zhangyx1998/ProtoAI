// ------------------------------------------------------
// Copyright (c) 2025 Yuxuan Zhang
// This source code is licensed under the MIT license.
// You may find the full license in project root directory.
// -------------------------------------------------------
#pragma once

#include <mutex>

#include <napi.h>

#include "utils/map-set.h"
#include "utils/type-name.h"

template <typename T> class Subscriber;

template <typename T> class Stream {
  friend class Subscriber<T>;
  std::mutex mutex;
  std::condition_variable active;
  enum State { PENDING, ACTIVE, CLOSED } state = PENDING;
  Set<Subscriber<T> *> subscribers;

  inline void __stream_close__() {
    VERBOSE("Stream<%s>::close()", type_name<T>().c_str());
    if (state != CLOSED && on_close)
      on_close();
    state = CLOSED;
  }

  void add(Subscriber<T> *subscriber) {
    std::scoped_lock lock(mutex);
    if (state == CLOSED)
      throw std::runtime_error("Stream already closed");
    subscribers.insert(subscriber);
    if (state == PENDING) {
      state = ACTIVE;
      active.notify_all();
    }
  };

  void remove(Subscriber<T> *subscriber) {
    std::scoped_lock lock(mutex);
    subscribers.erase(subscriber);
    if (subscribers.empty())
      __stream_close__();
  };

  typedef void (*OnClose)(void *hint);
  std::function<void()> on_close;

public:
  typedef std::shared_ptr<Stream<T>> Ptr;
  template <typename... Args> static Ptr create(Args &&...args) {
    return std::make_shared<Stream<T>>(std::forward<Args>(args)...);
  }

  Stream(std::function<void()> on_close = nullptr) : on_close(on_close) {}
  void push(T data) {
    std::scoped_lock lock(mutex);
    for (auto sub : subscribers)
      sub->push(data);
  };
  void close() {
    std::scoped_lock lock(mutex);
    for (auto sub : subscribers) {
      sub->stream = nullptr; // Prevent back-calls
      sub->close();
    }
    __stream_close__();
  };
  template <typename... Args> void crash(Args &&...args) {
    std::scoped_lock lock(mutex);
    auto error = std::make_shared<std::string>(std::forward<Args>(args)...);
    for (auto sub : subscribers) {
      // sub->error is written without lock, but it's ok since we are the only
      // writer to this value, and the reader will not receive any new data in
      // this process.
      sub->error = error;
      sub->stream = nullptr; // Prevent back-calls
      sub->close();
    }
    __stream_close__();
  };
};

template <typename T> class Subscriber {
  friend class Stream<T>;
  // Pointer back to the stream we are subscribed to
  // State transfer: no-null -> null (one time)
  Stream<T> *stream;
  // Error state set by Stream::crash()
  // State transfer: null -> non-null (one time)
  std::shared_ptr<std::string> error = nullptr;

protected:
  // state_mutex governs stream and error
  std::mutex state_mutex;
  /** Assumes caller already acquired state_mutex */
  inline bool active() { return stream && !error; }
  inline bool errored() { return error != nullptr; }
  inline std::string what() { return error ? *error : "No error"; }

  // API exposed to stream object, likely called from other threads
  virtual void push(T item) = 0;
  virtual void close() {
    std::scoped_lock state_lock(state_mutex);
    if (stream)
      stream->remove(this);
    stream = nullptr;
  }

public:
  Subscriber() = delete;
  Subscriber(Stream<T> *stream) : stream(stream) {
    std::scoped_lock state_lock(state_mutex);
    if (stream)
      stream->add(this);
  }
  ~Subscriber() { close(); }
};

#include "Frame.h"
using CameraStream = Stream<Frame::Ptr>;
