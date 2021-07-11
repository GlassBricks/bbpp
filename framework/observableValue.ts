/*
interface Value<T> {
  value: T
}

export type Observer<T> = (oldValue: T, newValue: T) => void

export class ObservableValue<T> implements Value<T> {
  // readonly hack
  // getters/setters moderately expensive
  public readonly value!: T
  private observers: Observer<T>[] = []

  constructor(initialValue: T) {
    this.value = initialValue
  }

  set(newValue: T): void {
    const oldValue = this.value
    ;(this as Value<T>).value = newValue
    for (const observer of this.observers) {
      observer(oldValue, newValue)
    }
  }

  addObserver(observer: Observer<T>) : void{
    this.observers[this.observers.length] = observer
  }
}
*/
