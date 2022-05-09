'use strict'

// 一个 Promise 具有三种状态
// A promise must be in one of three states: pending, fulfilled, or rejected.
var validStates = {
  PENDING: 0,
  FULFILLED: 1,
  REJECTED: 2,
}

var isValidState = function (state) {
  return state === validStates.PENDING || state === validStates.REJECTED || state === validStates.FULFILLED
}

var Utils = {
  runAsync: function (fn) {
    setTimeout(fn, 0)
  },
  isObject: function (obj) {
    return obj && typeof obj === 'object'
  },
  isFunction: function (fn) {
    return fn && typeof fn === 'function'
  },
}

// 2.2.1 Both onFulfilled and onRejected are optional arguments
var then = function (onFulfilled, onRejected) {
  var queuedPromise = new myPromise()

  // 2.2.2 If onFulfilled is a function:
  if (Utils.isFunction(onFulfilled)) {
    queuedPromise.handlers.fulfill = onFulfilled
  }

  // 2.2.3 If onRejected is a function,
  if (Utils.isFunction(onRejected)) {
    queuedPromise.handlers.reject = onRejected
  }

  // 2.2.6 then may be called multiple times on the same promise.
  this.queue.push(queuedPromise)
  // 执行队列
  this.process()

  // 2.2.7 then must return a promise
  return queuedPromise
}

// 改变状态
var transition = function (state, value) {
  if (
    // 当传递的状态是pending时，不执行队列
    this.state === state ||
    // 当已经是非pending状态时，不执行
    // 2.1.2.1 must not transition to any other state.
    // 2.1.3.1 must not transition to any other state.
    this.state !== validStates.PENDING ||
    !isValidState(state) ||
    arguments.length !== 2
  ) {
    return
  }

  this.state = state
  this.value = value
  this.process()
}

var process = function () {
  // 当状态是pending时，不执行队列
  // 2.2.2.2 it must not be called before promise is fulfilled.
  // 2.2.3.2 it must not be called before promise is rejected.
  if (this.state === validStates.PENDING) {
    return
  }

  var that = this,
    // 2.2.7.3 If onFulfilled is not a function and promise1 is fulfilled, promise2 must be fulfilled with the same value as promise1
    fulfillFallBack = function (value) {
      return value
    },
    //2.2.7.4 If onRejected is not a function and promise1 is rejected, promise2 must be rejected with the same reason as promise1.
    rejectFallBack = function (reason) {
      throw reason
    }

  Utils.runAsync(function () {
    // 2.2.6.1 If/when promise is fulfilled, all respective onFulfilled callbacks must execute in the order of their originating calls to then.
    // 2.2.6.2 If/when promise is rejected, all respective onRejected callbacks must execute in the order of their originating calls to then.
    while (that.queue.length) {
      var queuedPromise = that.queue.shift(),
        handler = null,
        value
      // 2.2.2.1 it must be called after promise is fulfilled, with promise’s value as its first argument.
      // 2.2.2.3 it must not be called more than once.
      if (that.state === validStates.FULFILLED) {
        // 2.2.1.1 If onFulfilled is not a function, it must be ignored.
        handler = queuedPromise.handlers.fulfill || fulfillFallBack
      }
      // 2.2.3.1 it must be called after promise is rejected, with promise’s reason as its first argument.
      // 2.2.3.3 it must not be called more than once.
      else if (that.state === validStates.REJECTED) {
        // 2.2.1.2 If onRejected is not a function, it must be ignored.
        handler = queuedPromise.handlers.reject || rejectFallBack
      }

      try {
        // 为了让执行的方法的this指向外部，那么就需要作用域提升至全局
        // 2.2.5 onFulfilled and onRejected must be called as functions (i.e. with no this value). #[3.2]
        // 3.2 That is, in strict mode this will be undefined inside of them; in sloppy mode, it will be the global object.
        value = handler(that.value)
      } catch (error) {
        // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.
        queuedPromise.transition(validStates.REJECTED, error)
        continue
      }

      // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x)
      Resolve(queuedPromise, value)
    }
  })
}

function Resolve(promise, x) {
  // 2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason.
  if (promise === x) {
    promise.transition(validStates.REJECTED, new TypeError('promise can not be resolved with itself'))
  }
  // 2.3.2 If x is a promise, adopt its state
  else if (x instanceof myPromise) {
    // 2.3.2.1 If x is pending, promise must remain pending until x is fulfilled or rejected.
    if (x.state === validStates.PENDING) {
      x.then(
        function (value) {
          Resolve(promise, value)
        },
        function (reason) {
          promise.reject(reason)
        }
      )
    }
    // 2.3.2.2 If/when x is fulfilled, fulfill promise with the same value.
    // 2.3.2.3 If/when x is rejected, reject promise with the same reason.
    else {
      promise.transition(x.state, x.value)
    }
  }
  // 2.3.3 Otherwise, if x is an object or function,
  else if (Utils.isObject(x) || Utils.isFunction(x)) {
    var thenHandler,
      called = false
    try {
      // 2.3.3.1 Let then be x.then.
      thenHandler = x.then
      // 2.3.3.3 If then is a function, call it with x as this, first argument resolvePromise, and second argument rejectPromise, where
      if (Utils.isFunction(thenHandler)) {
        thenHandler.call(
          x,
          // 2.3.3.3.1 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y)
          function (y) {
            // 2.3.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored
            if (!called) {
              Resolve(promise, y)
              called = true
            }
          },
          // 2.3.3.3.2 If/when rejectPromise is called with a reason r, reject promise with r
          function (r) {
            // 2.3.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored
            if (!called) {
              promise.reject(r)
              called = true
            }
          }
        )
      }
      // 2.3.3.4 If then is not a function, fulfill promise with x.
      else {
        promise.fulfill(x)
        called = true
      }
    } catch (error) {
      // 2.3.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored
      // 2.3.3.3.4 If calling then throws an exception e,
      // 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it.
      if (!called) {
        // 2.3.3.2 If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason.
        // 2.3.3.3.4.2 Otherwise, reject promise with e as the reason.
        promise.reject(error)
        called = true
      }
    }
  }
  // 2.3.4 If x is not an object or function, fulfill promise with x.
  else {
    promise.fulfill(x)
  }
}

var fulfill = function (value) {
  this.transition(validStates.FULFILLED, value)
}
var reject = function (reason) {
  this.transition(validStates.REJECTED, reason)
}

var myPromise = function (fn) {
  var that = this

  // 2.1.1 When pending, a promise:
  // 2.1.1.1 may transition to either the fulfilled or rejected state.
  this.state = validStates.PENDING
  this.value = null
  // 用于缓存同步的事件，获取执行后的状态
  this.queue = []
  this.handlers = {
    fulfill: null,
    reject: null,
  }

  // 2.2.4 onFulfilled or onRejected must not be called until the execution context stack contains only platform code
  if (fn) {
    fn(
      function (value) {
        Resolve(that, value)
      },
      function (reason) {
        that.reject(reason)
      }
    )
  }
}

myPromise.prototype.transition = transition
myPromise.prototype.then = then
myPromise.prototype.fulfill = fulfill
myPromise.prototype.reject = reject
myPromise.prototype.process = process

module.exports = {
  resolved: function (value) {
    return new myPromise(function (resolve) {
      resolve(value)
    })
  },
  rejected: function (reason) {
    return new myPromise(function (resolve, reject) {
      reject(reason)
    })
  },
  deferred: function () {
    var resolve, reject
    return {
      promise: new myPromise(function (_resolve, _reject) {
        resolve = _resolve
        reject = _reject
      }),
      resolve: resolve,
      reject: reject,
    }
  },
}
