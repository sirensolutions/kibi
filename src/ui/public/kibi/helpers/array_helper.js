import _ from 'lodash';

export class ArrayHelper {
  static add(array, object, callback) {
    array.push(object);
    if (callback) {
      callback();
    }
  }

  static remove(array, index, callback) {
    array.splice(index, 1);
    if (callback) {
      callback();
    }
  }

  static up(array, index, callback) {
    if (index > 0) {
      const newIndex = index - 1;
      const currentElement = _.clone(array[index], true);
      array.splice(index, 1);
      array.splice(newIndex, 0, currentElement);
      if (callback) {
        callback();
      }
    }
  }

  static down(array, index, callback) {
    if (index < array.length - 1) {
      const newIndex = index + 1;
      const currentElement = _.clone(array[index], true);
      array.splice(index, 1);
      array.splice(newIndex, 0, currentElement);
      if (callback) {
        callback();
      }
    }
  }
};
