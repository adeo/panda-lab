// export class Mutex {
//   private mutex = Promise.resolve();
//
//   lock(): PromiseLike<() => void> {
//     let begin: (unlock: () => void) => void = () => {
//     };
//
//     this.mutex = this.mutex.then(() => {
//       return new Promise(begin);
//     });
//
//     return new Promise(res => {
//       begin = res;
//     });
//   }
//
//   async dispatch<T>(fn: (() => T) | (() => PromiseLike<T>)): Promise<T> {
//     const unlock = await this.lock();
//     try {
//       return await Promise.resolve(fn());
//     } finally {
//       unlock();
//     }
//   }
// }
//
//
// /**
//  * Async forEach in array
//  * @param array
//  * @param callback
//  */
// export async function asyncForEach<T>(array: Array<T>, callback: (T, number, Array) => void) {
//   for (let index = 0; index < array.length; index++) {
//     await callback(array[index], index, array);
//   }
// }
