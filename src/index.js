import Vue from 'vue'
import assign from 'nano-assign'

export default function zerotwo({ state, actions, views }) {
  return newState => {
    const subscribers = []
    const computed = Object.create(null)
    const methods = Object.create(null)
    const reactiveStore = {
      subscribe: fn => subscribers.push(fn)
    }

    if (newState) {
      state = assign({}, state, newState)
    }
    for (const key in state) {
      Vue.util.defineReactive(reactiveStore, key, state[key])
    }

    if (views) {
      const boundViews = views(reactiveStore)
      for (const key in boundViews) {
        const desc = Object.getOwnPropertyDescriptor(boundViews, key)
        if (desc.get) {
          computed[key] = desc.get.bind(computed)
        } else if (desc.value) {
          methods[key] = desc.value.bind(methods)
        }
      }
    }
    const silent = Vue.config.silent
    Vue.config.silent = true
    const vm = new Vue({
      computed,
      methods
    })
    Vue.config.silent = silent

    for (const key in computed) {
      Object.defineProperty(reactiveStore, key, {
        get: () => vm[key],
        enumerable: true
      })
    }
    for (const key in methods) {
      reactiveStore[key] = methods[key]
    }

    if (actions) {
      const boundActions = actions(reactiveStore)
      for (const key in boundActions) {
        const action = boundActions[key]
        reactiveStore[key] = (...args) => {
          action(...args)
          subscribers.forEach(sub => sub(key, ...args))
        }
      }
    }

    return reactiveStore
  }
}

export const BindStore = Vue => {
  Vue.mixin({
    beforeCreate() {
      this.$store = this.$options.store || (this.$parent && this.$parent.$store)
    }
  })
}
