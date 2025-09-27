// ------------------------------------------------------
// Copyright (c) 2025 Yuxuan Zhang
// This source code is licensed under the MIT license.
// You may find the full license in project root directory.
// -------------------------------------------------------
#pragma once

// Type specific initialization
// initializer is responsible for checking nullptr
template <typename T> T &initialize(T &);
template <typename T> T *initialize(T *ptr) {
  noNull<T *>(ptr);
  initialize<T>(*ptr);
  return ptr;
};
