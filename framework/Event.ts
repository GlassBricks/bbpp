export type Observer<T> = (this: void, event: T) => void

export class Event<T> {
  private observers: Observer<T>[] = []

  subscribe(observer: Observer<T>): void {
    this.observers[this.observers.length] = observer
  }

  subscribeEarly(observer: Observer<T>): void {
    table.insert(this.observers, 1, observer)
  }

  raise(event: T): void {
    for (const observer of this.observers) {
      observer(event)
    }
  }
}
