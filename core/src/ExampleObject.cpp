// ------------------------------------------------------
// Copyright (c) 2025 Yuxuan Zhang
// This source code is licensed under the MIT license.
// You may find the full license in project root directory.
// -------------------------------------------------------
#include <cstddef>
#include <cstring>
#include <memory>

#include <napi.h>

#include "CoreObject.h"
#include "utils/napi-helper.h"

using namespace Napi;

typedef std::shared_ptr<long> CounterPtr;

class CounterObject : public CoreObject<CounterObject, CounterPtr> {
  CORE_OBJECT_DECL(CounterObject);

public:
  using CoreObject::CoreObject;
  static inline const std::string name = "Counter";
  static inline Function Init(Napi::Env env) {
    auto iterator = Napi::Symbol::WellKnown(env, "iterator");
    auto fn =
        DefineClass(env, CounterObject::name.c_str(),
                    {CORE_OBJECT_REGISTER(CounterObject, env),           //
                     InstanceMethod<&CounterObject::iterator>(iterator), //
                     INSTANCE_METHOD(CounterObject, next),               //
                     INSTANCE_ACCESSOR(CounterObject, value)});
    fn.Set("create", Function::New(env, CounterObject::create));
    return fn;
  }

  static FN(create) {
    long value = 0;
    if (info.Length() > 0 && info[0].IsNumber())
      value = info[0].As<Napi::Number>().Int64Value();
    auto ptr = std::make_shared<long>(value);
    return CounterObject::Create(info.Env(), ptr);
  }

  long &value() { return *core(); }

  FN(iterator) { return info.This(); }

  FN(next) {
    auto &value = this->value();
    value += 1;
    return IterNext(env, Napi::Number::New(env, value));
  }

  GET(value) { return Napi::Number::New(env, this->value()); }
  SET(value) {
    JS_ASSERT(info.Length() > 0 && info[0].IsNumber(), TypeError,
              "Value must be a number");
    this->value() = info[0].As<Napi::Number>().Int64Value();
  }
};

CORE_OBJECT(CounterPtr, CounterObject);
