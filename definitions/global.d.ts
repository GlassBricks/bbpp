declare const global: Global

/**
 * You can add additional fields to global (for typescript), in a typescript module, using:
 *
 * declare global { // this "global" means typescript global scope, different from factorio global
 *    interface Global {
 *      someNumber: number
 *      someTable: Record<string, MyType>
 *    }
 * }
 *
 * If you aren't in a typescript module (no import/export), you don't need `declare global {...}`
 */
interface Global {}
