// ------------------------------------------------------
// Copyright (c) 2025 Yuxuan Zhang
// This source code is licensed under the MIT license.
// You may find the full license in project root directory.
// -------------------------------------------------------
#pragma once
#include <exception>

#define EXPECT_END_OF_STREAM                                                   \
  catch (threading::EOS &) {                                                   \
    /* Normal termination */                                                   \
  }

namespace threading {

class EOS : public std::exception {};
class Timeout : public std::exception {};

} // namespace threading
