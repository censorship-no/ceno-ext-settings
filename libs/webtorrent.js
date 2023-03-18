/******/ var __webpack_modules__ = ({

/***/ 9742:
/***/ ((__unused_webpack_module, exports) => {



exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}


/***/ }),

/***/ 2090:
/***/ ((module) => {

function concat (chunks, size) {
  if (typeof chunks[0] === 'string') return chunks.join('')
  if (typeof chunks[0] === 'number') return new Uint8Array(chunks)
  const b = new Uint8Array(size)
  let offset = 0
  for (let i = 0, l = chunks.length; i < l; i++) {
    const chunk = chunks[i]
    b.set(chunk, offset)
    offset += chunk.byteLength || chunk.length
  }

  return b
}

module.exports = async function * (iterator, size = 512, opts = {}) {
  if (typeof size === 'object') {
    opts = size
    size = opts.size
  }
  let { nopad, zeroPadding = true } = opts

  if (nopad) zeroPadding = false

  let buffered = []
  let bufferedBytes = 0

  for await (const value of iterator) {
    bufferedBytes += value.byteLength || value.length || 1
    buffered.push(value)

    if (bufferedBytes >= size) {
      const b = concat(buffered, bufferedBytes)
      let offset = 0

      while (bufferedBytes >= size) {
        yield b.slice(offset, offset + size)
        bufferedBytes -= size
        offset += size
      }

      buffered = [b.slice(offset, b.length)]
    }
  }
  if (bufferedBytes) yield concat(buffered, zeroPadding ? size : bufferedBytes)
}


/***/ }),

/***/ 8764:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */



const base64 = __webpack_require__(9742)
const ieee754 = __webpack_require__(645)
const customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

const K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    const arr = new Uint8Array(1)
    const proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  const buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayView(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  const valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  const b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpreted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  const length = byteLength(string, encoding) | 0
  let buf = createBuffer(length)

  const actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  const length = array.length < 0 ? 0 : checked(array.length) | 0
  const buf = createBuffer(length)
  for (let i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayView (arrayView) {
  if (isInstance(arrayView, Uint8Array)) {
    const copy = new Uint8Array(arrayView)
    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
  }
  return fromArrayLike(arrayView)
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  let buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    const len = checked(obj.length) | 0
    const buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  let x = a.length
  let y = b.length

  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  let i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  const buffer = Buffer.allocUnsafe(length)
  let pos = 0
  for (i = 0; i < list.length; ++i) {
    let buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      if (pos + buf.length > buffer.length) {
        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf)
        buf.copy(buffer, pos)
      } else {
        Uint8Array.prototype.set.call(
          buffer,
          buf,
          pos
        )
      }
    } else if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    } else {
      buf.copy(buffer, pos)
    }
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  const len = string.length
  const mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  let loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  let loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  const i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  const len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (let i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  const len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (let i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  const len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (let i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  const length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  let str = ''
  const max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  let x = thisEnd - thisStart
  let y = end - start
  const len = Math.min(x, y)

  const thisCopy = this.slice(thisStart, thisEnd)
  const targetCopy = target.slice(start, end)

  for (let i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  let indexSize = 1
  let arrLength = arr.length
  let valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  let i
  if (dir) {
    let foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      let found = true
      for (let j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  const remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  const strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  let i
  for (i = 0; i < length; ++i) {
    const parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  const remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  let loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
      case 'latin1':
      case 'binary':
        return asciiWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  const res = []

  let i = start
  while (i < end) {
    const firstByte = buf[i]
    let codePoint = null
    let bytesPerSequence = (firstByte > 0xEF)
      ? 4
      : (firstByte > 0xDF)
          ? 3
          : (firstByte > 0xBF)
              ? 2
              : 1

    if (i + bytesPerSequence <= end) {
      let secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
const MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  const len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  let res = ''
  let i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  let ret = ''
  end = Math.min(buf.length, end)

  for (let i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  let ret = ''
  end = Math.min(buf.length, end)

  for (let i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  const len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  let out = ''
  for (let i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  const bytes = buf.slice(start, end)
  let res = ''
  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
  for (let i = 0; i < bytes.length - 1; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  const len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  const newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUintLE =
Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let val = this[offset]
  let mul = 1
  let i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUintBE =
Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  let val = this[offset + --byteLength]
  let mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUint8 =
Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUint16LE =
Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUint16BE =
Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUint32LE =
Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUint32BE =
Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const lo = first +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 24

  const hi = this[++offset] +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    last * 2 ** 24

  return BigInt(lo) + (BigInt(hi) << BigInt(32))
})

Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const hi = first * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    this[++offset]

  const lo = this[++offset] * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    last

  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
})

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let val = this[offset]
  let mul = 1
  let i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let i = byteLength
  let mul = 1
  let val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  const val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  const val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const val = this[offset + 4] +
    this[offset + 5] * 2 ** 8 +
    this[offset + 6] * 2 ** 16 +
    (last << 24) // Overflow

  return (BigInt(val) << BigInt(32)) +
    BigInt(first +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 24)
})

Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const val = (first << 24) + // Overflow
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    this[++offset]

  return (BigInt(val) << BigInt(32)) +
    BigInt(this[++offset] * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    last)
})

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUintLE =
Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  let mul = 1
  let i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUintBE =
Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  let i = byteLength - 1
  let mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUint8 =
Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUint16LE =
Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUint16BE =
Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUint32LE =
Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUint32BE =
Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function wrtBigUInt64LE (buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7)

  let lo = Number(value & BigInt(0xffffffff))
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff))
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  return offset
}

function wrtBigUInt64BE (buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7)

  let lo = Number(value & BigInt(0xffffffff))
  buf[offset + 7] = lo
  lo = lo >> 8
  buf[offset + 6] = lo
  lo = lo >> 8
  buf[offset + 5] = lo
  lo = lo >> 8
  buf[offset + 4] = lo
  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff))
  buf[offset + 3] = hi
  hi = hi >> 8
  buf[offset + 2] = hi
  hi = hi >> 8
  buf[offset + 1] = hi
  hi = hi >> 8
  buf[offset] = hi
  return offset + 8
}

Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
})

Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
})

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    const limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  let i = 0
  let mul = 1
  let sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    const limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  let i = byteLength - 1
  let mul = 1
  let sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
})

Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
})

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  const len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      const code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  let i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    const bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    const len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// CUSTOM ERRORS
// =============

// Simplified versions from Node, changed for Buffer-only usage
const errors = {}
function E (sym, getMessage, Base) {
  errors[sym] = class NodeError extends Base {
    constructor () {
      super()

      Object.defineProperty(this, 'message', {
        value: getMessage.apply(this, arguments),
        writable: true,
        configurable: true
      })

      // Add the error code to the name to include it in the stack trace.
      this.name = `${this.name} [${sym}]`
      // Access the stack to generate the error message including the error code
      // from the name.
      this.stack // eslint-disable-line no-unused-expressions
      // Reset the name to the actual name.
      delete this.name
    }

    get code () {
      return sym
    }

    set code (value) {
      Object.defineProperty(this, 'code', {
        configurable: true,
        enumerable: true,
        value,
        writable: true
      })
    }

    toString () {
      return `${this.name} [${sym}]: ${this.message}`
    }
  }
}

E('ERR_BUFFER_OUT_OF_BOUNDS',
  function (name) {
    if (name) {
      return `${name} is outside of buffer bounds`
    }

    return 'Attempt to access memory outside buffer bounds'
  }, RangeError)
E('ERR_INVALID_ARG_TYPE',
  function (name, actual) {
    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
  }, TypeError)
E('ERR_OUT_OF_RANGE',
  function (str, range, input) {
    let msg = `The value of "${str}" is out of range.`
    let received = input
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input))
    } else if (typeof input === 'bigint') {
      received = String(input)
      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
        received = addNumericalSeparator(received)
      }
      received += 'n'
    }
    msg += ` It must be ${range}. Received ${received}`
    return msg
  }, RangeError)

function addNumericalSeparator (val) {
  let res = ''
  let i = val.length
  const start = val[0] === '-' ? 1 : 0
  for (; i >= start + 4; i -= 3) {
    res = `_${val.slice(i - 3, i)}${res}`
  }
  return `${val.slice(0, i)}${res}`
}

// CHECK FUNCTIONS
// ===============

function checkBounds (buf, offset, byteLength) {
  validateNumber(offset, 'offset')
  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
    boundsError(offset, buf.length - (byteLength + 1))
  }
}

function checkIntBI (value, min, max, buf, offset, byteLength) {
  if (value > max || value < min) {
    const n = typeof min === 'bigint' ? 'n' : ''
    let range
    if (byteLength > 3) {
      if (min === 0 || min === BigInt(0)) {
        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`
      } else {
        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
                `${(byteLength + 1) * 8 - 1}${n}`
      }
    } else {
      range = `>= ${min}${n} and <= ${max}${n}`
    }
    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
  }
  checkBounds(buf, offset, byteLength)
}

function validateNumber (value, name) {
  if (typeof value !== 'number') {
    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
  }
}

function boundsError (value, length, type) {
  if (Math.floor(value) !== value) {
    validateNumber(value, type)
    throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
  }

  if (length < 0) {
    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
  }

  throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
                                    `>= ${type ? 1 : 0} and <= ${length}`,
                                    value)
}

// HELPER FUNCTIONS
// ================

const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  let codePoint
  const length = string.length
  let leadSurrogate = null
  const bytes = []

  for (let i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  const byteArray = []
  for (let i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  let c, hi, lo
  const byteArray = []
  for (let i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  let i
  for (i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
const hexSliceLookupTable = (function () {
  const alphabet = '0123456789abcdef'
  const table = new Array(256)
  for (let i = 0; i < 16; ++i) {
    const i16 = i * 16
    for (let j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

// Return not function with Error if BigInt not supported
function defineBigIntMethod (fn) {
  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
}

function BufferBigIntNotDefined () {
  throw new Error('BigInt not supported')
}


/***/ }),

/***/ 9421:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*! cache-chunk-store. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
const LRU = __webpack_require__(7117)
const queueMicrotask = __webpack_require__(4375)

class CacheStore {
  constructor (store, opts) {
    this.store = store
    this.chunkLength = store.chunkLength
    this.inProgressGets = new Map() // Map from chunk index to info on callbacks waiting for that chunk

    if (!this.store || !this.store.get || !this.store.put) {
      throw new Error('First argument must be abstract-chunk-store compliant')
    }

    this.cache = new LRU(opts)
  }

  put (index, buf, cb = () => {}) {
    if (!this.cache) {
      return queueMicrotask(() => cb(new Error('CacheStore closed')))
    }

    this.cache.remove(index)
    this.store.put(index, buf, cb)
  }

  get (index, opts, cb = () => {}) {
    if (typeof opts === 'function') return this.get(index, null, opts)

    if (!this.cache) {
      return queueMicrotask(() => cb(new Error('CacheStore closed')))
    }

    if (!opts) opts = {}

    let buf = this.cache.get(index)
    if (buf) {
      const offset = opts.offset || 0
      const len = opts.length || (buf.length - offset)
      if (offset !== 0 || len !== buf.length) {
        buf = buf.slice(offset, len + offset)
      }
      return queueMicrotask(() => cb(null, buf))
    }

    // See if a get for this index has already started
    let waiters = this.inProgressGets.get(index)
    const getAlreadyStarted = !!waiters
    if (!waiters) {
      waiters = []
      this.inProgressGets.set(index, waiters)
    }

    waiters.push({
      opts,
      cb
    })

    if (!getAlreadyStarted) {
      this.store.get(index, (err, buf) => {
        if (!err && this.cache != null) this.cache.set(index, buf)

        const inProgressEntry = this.inProgressGets.get(index)
        this.inProgressGets.delete(index)

        for (const { opts, cb } of inProgressEntry) {
          if (err) {
            cb(err)
          } else {
            const offset = opts.offset || 0
            const len = opts.length || (buf.length - offset)
            let slicedBuf = buf
            if (offset !== 0 || len !== buf.length) {
              slicedBuf = buf.slice(offset, len + offset)
            }
            cb(null, slicedBuf)
          }
        }
      })
    }
  }

  close (cb = () => {}) {
    if (!this.cache) {
      return queueMicrotask(() => cb(new Error('CacheStore closed')))
    }

    this.cache = null
    this.store.close(cb)
  }

  destroy (cb = () => {}) {
    if (!this.cache) {
      return queueMicrotask(() => cb(new Error('CacheStore closed')))
    }

    this.cache = null
    this.store.destroy(cb)
  }
}

module.exports = CacheStore


/***/ }),

/***/ 6313:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(8764)["Buffer"];
var clone = (function() {
'use strict';

function _instanceof(obj, type) {
  return type != null && obj instanceof type;
}

var nativeMap;
try {
  nativeMap = Map;
} catch(_) {
  // maybe a reference error because no `Map`. Give it a dummy value that no
  // value will ever be an instanceof.
  nativeMap = function() {};
}

var nativeSet;
try {
  nativeSet = Set;
} catch(_) {
  nativeSet = function() {};
}

var nativePromise;
try {
  nativePromise = Promise;
} catch(_) {
  nativePromise = function() {};
}

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
 * @param `includeNonEnumerable` - set to true if the non-enumerable properties
 *    should be cloned as well. Non-enumerable properties on the prototype
 *    chain will be ignored. (optional - false by default)
*/
function clone(parent, circular, depth, prototype, includeNonEnumerable) {
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    includeNonEnumerable = circular.includeNonEnumerable;
    circular = circular.circular;
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth === 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (_instanceof(parent, nativeMap)) {
      child = new nativeMap();
    } else if (_instanceof(parent, nativeSet)) {
      child = new nativeSet();
    } else if (_instanceof(parent, nativePromise)) {
      child = new nativePromise(function (resolve, reject) {
        parent.then(function(value) {
          resolve(_clone(value, depth - 1));
        }, function(err) {
          reject(_clone(err, depth - 1));
        });
      });
    } else if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      if (Buffer.allocUnsafe) {
        // Node.js >= 4.5.0
        child = Buffer.allocUnsafe(parent.length);
      } else {
        // Older Node.js versions
        child = new Buffer(parent.length);
      }
      parent.copy(child);
      return child;
    } else if (_instanceof(parent, Error)) {
      child = Object.create(parent);
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    if (_instanceof(parent, nativeMap)) {
      parent.forEach(function(value, key) {
        var keyChild = _clone(key, depth - 1);
        var valueChild = _clone(value, depth - 1);
        child.set(keyChild, valueChild);
      });
    }
    if (_instanceof(parent, nativeSet)) {
      parent.forEach(function(value) {
        var entryChild = _clone(value, depth - 1);
        child.add(entryChild);
      });
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(parent);
      for (var i = 0; i < symbols.length; i++) {
        // Don't need to worry about cloning a symbol because it is a primitive,
        // like a number or string.
        var symbol = symbols[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, symbol);
        if (descriptor && !descriptor.enumerable && !includeNonEnumerable) {
          continue;
        }
        child[symbol] = _clone(parent[symbol], depth - 1);
        if (!descriptor.enumerable) {
          Object.defineProperty(child, symbol, {
            enumerable: false
          });
        }
      }
    }

    if (includeNonEnumerable) {
      var allPropertyNames = Object.getOwnPropertyNames(parent);
      for (var i = 0; i < allPropertyNames.length; i++) {
        var propertyName = allPropertyNames[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, propertyName);
        if (descriptor && descriptor.enumerable) {
          continue;
        }
        child[propertyName] = _clone(parent[propertyName], depth - 1);
        Object.defineProperty(child, propertyName, {
          enumerable: false
        });
      }
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
}
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
}
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
}
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
}
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
}
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if ( true && module.exports) {
  module.exports = clone;
}


/***/ }),

/***/ 9648:
/***/ ((module) => {

module.exports = function cpus () {
  var num = navigator.hardwareConcurrency || 1
  var cpus = []
  for (var i = 0; i < num; i++) {
    cpus.push({
      model: '',
      speed: 0,
      times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 }
    })
  }
  return cpus
}


/***/ }),

/***/ 1227:
/***/ ((module, exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);
/* eslint-env browser */

/**
 * This is the web browser implementation of `debug()`.
 */

exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = localstorage();
exports.destroy = (() => {
	let warned = false;

	return () => {
		if (!warned) {
			warned = true;
			console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
		}
	};
})();

/**
 * Colors.
 */

exports.colors = [
	'#0000CC',
	'#0000FF',
	'#0033CC',
	'#0033FF',
	'#0066CC',
	'#0066FF',
	'#0099CC',
	'#0099FF',
	'#00CC00',
	'#00CC33',
	'#00CC66',
	'#00CC99',
	'#00CCCC',
	'#00CCFF',
	'#3300CC',
	'#3300FF',
	'#3333CC',
	'#3333FF',
	'#3366CC',
	'#3366FF',
	'#3399CC',
	'#3399FF',
	'#33CC00',
	'#33CC33',
	'#33CC66',
	'#33CC99',
	'#33CCCC',
	'#33CCFF',
	'#6600CC',
	'#6600FF',
	'#6633CC',
	'#6633FF',
	'#66CC00',
	'#66CC33',
	'#9900CC',
	'#9900FF',
	'#9933CC',
	'#9933FF',
	'#99CC00',
	'#99CC33',
	'#CC0000',
	'#CC0033',
	'#CC0066',
	'#CC0099',
	'#CC00CC',
	'#CC00FF',
	'#CC3300',
	'#CC3333',
	'#CC3366',
	'#CC3399',
	'#CC33CC',
	'#CC33FF',
	'#CC6600',
	'#CC6633',
	'#CC9900',
	'#CC9933',
	'#CCCC00',
	'#CCCC33',
	'#FF0000',
	'#FF0033',
	'#FF0066',
	'#FF0099',
	'#FF00CC',
	'#FF00FF',
	'#FF3300',
	'#FF3333',
	'#FF3366',
	'#FF3399',
	'#FF33CC',
	'#FF33FF',
	'#FF6600',
	'#FF6633',
	'#FF9900',
	'#FF9933',
	'#FFCC00',
	'#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

// eslint-disable-next-line complexity
function useColors() {
	// NB: In an Electron preload script, document will be defined but not fully
	// initialized. Since we know we're in Chrome, we'll just detect this case
	// explicitly
	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
		return true;
	}

	// Internet Explorer and Edge do not support colors.
	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
		return false;
	}

	// Is webkit? http://stackoverflow.com/a/16459606/376773
	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
		// Is firebug? http://stackoverflow.com/a/398120/376773
		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
		// Is firefox >= v31?
		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
		// Double check webkit in userAgent just in case we are in a worker
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	args[0] = (this.useColors ? '%c' : '') +
		this.namespace +
		(this.useColors ? ' %c' : ' ') +
		args[0] +
		(this.useColors ? '%c ' : ' ') +
		'+' + module.exports.humanize(this.diff);

	if (!this.useColors) {
		return;
	}

	const c = 'color: ' + this.color;
	args.splice(1, 0, c, 'color: inherit');

	// The final "%c" is somewhat tricky, because there could be other
	// arguments passed either before or after the %c, so we need to
	// figure out the correct index to insert the CSS into
	let index = 0;
	let lastC = 0;
	args[0].replace(/%[a-zA-Z%]/g, match => {
		if (match === '%%') {
			return;
		}
		index++;
		if (match === '%c') {
			// We only are interested in the *last* %c
			// (the user may have provided their own)
			lastC = index;
		}
	});

	args.splice(lastC, 0, c);
}

/**
 * Invokes `console.debug()` when available.
 * No-op when `console.debug` is not a "function".
 * If `console.debug` is not available, falls back
 * to `console.log`.
 *
 * @api public
 */
exports.log = console.debug || console.log || (() => {});

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	try {
		if (namespaces) {
			exports.storage.setItem('debug', namespaces);
		} else {
			exports.storage.removeItem('debug');
		}
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */
function load() {
	let r;
	try {
		r = exports.storage.getItem('debug');
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}

	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
	if (!r && typeof process !== 'undefined' && 'env' in process) {
		r = process.env.DEBUG;
	}

	return r;
}

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
	try {
		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
		// The Browser also has localStorage in the global context.
		return localStorage;
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

module.exports = __webpack_require__(2447)(exports);

const {formatters} = module.exports;

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

formatters.j = function (v) {
	try {
		return JSON.stringify(v);
	} catch (error) {
		return '[UnexpectedJSONParseError]: ' + error.message;
	}
};


/***/ }),

/***/ 2447:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */

function setup(env) {
	createDebug.debug = createDebug;
	createDebug.default = createDebug;
	createDebug.coerce = coerce;
	createDebug.disable = disable;
	createDebug.enable = enable;
	createDebug.enabled = enabled;
	createDebug.humanize = __webpack_require__(7824);
	createDebug.destroy = destroy;

	Object.keys(env).forEach(key => {
		createDebug[key] = env[key];
	});

	/**
	* The currently active debug mode names, and names to skip.
	*/

	createDebug.names = [];
	createDebug.skips = [];

	/**
	* Map of special "%n" handling functions, for the debug "format" argument.
	*
	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	*/
	createDebug.formatters = {};

	/**
	* Selects a color for a debug namespace
	* @param {String} namespace The namespace string for the debug instance to be colored
	* @return {Number|String} An ANSI color code for the given namespace
	* @api private
	*/
	function selectColor(namespace) {
		let hash = 0;

		for (let i = 0; i < namespace.length; i++) {
			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}

		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	}
	createDebug.selectColor = selectColor;

	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		let prevTime;
		let enableOverride = null;
		let namespacesCache;
		let enabledCache;

		function debug(...args) {
			// Disabled?
			if (!debug.enabled) {
				return;
			}

			const self = debug;

			// Set `diff` timestamp
			const curr = Number(new Date());
			const ms = curr - (prevTime || curr);
			self.diff = ms;
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;

			args[0] = createDebug.coerce(args[0]);

			if (typeof args[0] !== 'string') {
				// Anything else let's inspect with %O
				args.unshift('%O');
			}

			// Apply any `formatters` transformations
			let index = 0;
			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
				// If we encounter an escaped % then don't increase the array index
				if (match === '%%') {
					return '%';
				}
				index++;
				const formatter = createDebug.formatters[format];
				if (typeof formatter === 'function') {
					const val = args[index];
					match = formatter.call(self, val);

					// Now we need to remove `args[index]` since it's inlined in the `format`
					args.splice(index, 1);
					index--;
				}
				return match;
			});

			// Apply env-specific formatting (colors, etc.)
			createDebug.formatArgs.call(self, args);

			const logFn = self.log || createDebug.log;
			logFn.apply(self, args);
		}

		debug.namespace = namespace;
		debug.useColors = createDebug.useColors();
		debug.color = createDebug.selectColor(namespace);
		debug.extend = extend;
		debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

		Object.defineProperty(debug, 'enabled', {
			enumerable: true,
			configurable: false,
			get: () => {
				if (enableOverride !== null) {
					return enableOverride;
				}
				if (namespacesCache !== createDebug.namespaces) {
					namespacesCache = createDebug.namespaces;
					enabledCache = createDebug.enabled(namespace);
				}

				return enabledCache;
			},
			set: v => {
				enableOverride = v;
			}
		});

		// Env-specific initialization logic for debug instances
		if (typeof createDebug.init === 'function') {
			createDebug.init(debug);
		}

		return debug;
	}

	function extend(namespace, delimiter) {
		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
		newDebug.log = this.log;
		return newDebug;
	}

	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces) {
		createDebug.save(namespaces);
		createDebug.namespaces = namespaces;

		createDebug.names = [];
		createDebug.skips = [];

		let i;
		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
		const len = split.length;

		for (i = 0; i < len; i++) {
			if (!split[i]) {
				// ignore empty strings
				continue;
			}

			namespaces = split[i].replace(/\*/g, '.*?');

			if (namespaces[0] === '-') {
				createDebug.skips.push(new RegExp('^' + namespaces.slice(1) + '$'));
			} else {
				createDebug.names.push(new RegExp('^' + namespaces + '$'));
			}
		}
	}

	/**
	* Disable debug output.
	*
	* @return {String} namespaces
	* @api public
	*/
	function disable() {
		const namespaces = [
			...createDebug.names.map(toNamespace),
			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
		].join(',');
		createDebug.enable('');
		return namespaces;
	}

	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		if (name[name.length - 1] === '*') {
			return true;
		}

		let i;
		let len;

		for (i = 0, len = createDebug.skips.length; i < len; i++) {
			if (createDebug.skips[i].test(name)) {
				return false;
			}
		}

		for (i = 0, len = createDebug.names.length; i < len; i++) {
			if (createDebug.names[i].test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	* Convert regexp to namespace
	*
	* @param {RegExp} regxep
	* @return {String} namespace
	* @api private
	*/
	function toNamespace(regexp) {
		return regexp.toString()
			.substring(2, regexp.toString().length - 2)
			.replace(/\.\*\?$/, '*');
	}

	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) {
			return val.stack || val.message;
		}
		return val;
	}

	/**
	* XXX DO NOT USE. This is a temporary stub function.
	* XXX It WILL be removed in the next major release.
	*/
	function destroy() {
		console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
	}

	createDebug.enable(createDebug.load());

	return createDebug;
}

module.exports = setup;


/***/ }),

/***/ 2840:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);
var once = __webpack_require__(778);

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var isChildProcess = function(stream) {
	return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3
};

var eos = function(stream, opts, callback) {
	if (typeof opts === 'function') return eos(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var ws = stream._writableState;
	var rs = stream._readableState;
	var readable = opts.readable || (opts.readable !== false && stream.readable);
	var writable = opts.writable || (opts.writable !== false && stream.writable);
	var cancelled = false;

	var onlegacyfinish = function() {
		if (!stream.writable) onfinish();
	};

	var onfinish = function() {
		writable = false;
		if (!readable) callback.call(stream);
	};

	var onend = function() {
		readable = false;
		if (!writable) callback.call(stream);
	};

	var onexit = function(exitCode) {
		callback.call(stream, exitCode ? new Error('exited with error code: ' + exitCode) : null);
	};

	var onerror = function(err) {
		callback.call(stream, err);
	};

	var onclose = function() {
		process.nextTick(onclosenexttick);
	};

	var onclosenexttick = function() {
		if (cancelled) return;
		if (readable && !(rs && (rs.ended && !rs.destroyed))) return callback.call(stream, new Error('premature close'));
		if (writable && !(ws && (ws.ended && !ws.destroyed))) return callback.call(stream, new Error('premature close'));
	};

	var onrequest = function() {
		stream.req.on('finish', onfinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onfinish);
		stream.on('abort', onclose);
		if (stream.req) onrequest();
		else stream.on('request', onrequest);
	} else if (writable && !ws) { // legacy streams
		stream.on('end', onlegacyfinish);
		stream.on('close', onlegacyfinish);
	}

	if (isChildProcess(stream)) stream.on('exit', onexit);

	stream.on('end', onend);
	stream.on('finish', onfinish);
	if (opts.error !== false) stream.on('error', onerror);
	stream.on('close', onclose);

	return function() {
		cancelled = true;
		stream.removeListener('complete', onfinish);
		stream.removeListener('abort', onclose);
		stream.removeListener('request', onrequest);
		if (stream.req) stream.req.removeListener('finish', onfinish);
		stream.removeListener('end', onlegacyfinish);
		stream.removeListener('close', onlegacyfinish);
		stream.removeListener('finish', onfinish);
		stream.removeListener('exit', onexit);
		stream.removeListener('end', onend);
		stream.removeListener('error', onerror);
		stream.removeListener('close', onclose);
	};
};

module.exports = eos;


/***/ }),

/***/ 2114:
/***/ ((module) => {



/**
 * @typedef {{ [key: string]: any }} Extensions
 * @typedef {Error} Err
 * @property {string} message
 */

/**
 *
 * @param {Error} obj
 * @param {Extensions} props
 * @returns {Error & Extensions}
 */
function assign(obj, props) {
    for (const key in props) {
        Object.defineProperty(obj, key, {
            value: props[key],
            enumerable: true,
            configurable: true,
        });
    }

    return obj;
}

/**
 *
 * @param {any} err - An Error
 * @param {string|Extensions} code - A string code or props to set on the error
 * @param {Extensions} [props] - Props to set on the error
 * @returns {Error & Extensions}
 */
function createError(err, code, props) {
    if (!err || typeof err === 'string') {
        throw new TypeError('Please pass an Error to err-code');
    }

    if (!props) {
        props = {};
    }

    if (typeof code === 'object') {
        props = code;
        code = '';
    }

    if (code) {
        props.code = code;
    }

    try {
        return assign(err, props);
    } catch (_) {
        props.message = err.message;
        props.stack = err.stack;

        const ErrClass = function () {};

        ErrClass.prototype = Object.create(Object.getPrototypeOf(err));

        // @ts-ignore
        const output = assign(new ErrClass(), props);

        return output;
    }
}

module.exports = createError;


/***/ }),

/***/ 5573:
/***/ ((module) => {

/*!
 * escape-html
 * Copyright(c) 2012-2013 TJ Holowaychuk
 * Copyright(c) 2015 Andreas Lubbe
 * Copyright(c) 2015 Tiancheng "Timothy" Gu
 * MIT Licensed
 */



/**
 * Module variables.
 * @private
 */

var matchHtmlRegExp = /["'&<>]/;

/**
 * Module exports.
 * @public
 */

module.exports = escapeHtml;

/**
 * Escape special characters in the given string of html.
 *
 * @param  {string} string The string to escape for inserting into HTML
 * @return {string}
 * @public
 */

function escapeHtml(string) {
  var str = '' + string;
  var match = matchHtmlRegExp.exec(str);

  if (!match) {
    return str;
  }

  var escape;
  var html = '';
  var index = 0;
  var lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = '&quot;';
        break;
      case 38: // &
        escape = '&amp;';
        break;
      case 39: // '
        escape = '&#39;';
        break;
      case 60: // <
        escape = '&lt;';
        break;
      case 62: // >
        escape = '&gt;';
        break;
      default:
        continue;
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index
    ? html + str.substring(lastIndex, index)
    : html;
}


/***/ }),

/***/ 7187:
/***/ ((module) => {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}


/***/ }),

/***/ 3975:
/***/ ((module) => {

module.exports = class FixedFIFO {
  constructor (hwm) {
    if (!(hwm > 0) || ((hwm - 1) & hwm) !== 0) throw new Error('Max size for a FixedFIFO should be a power of two')
    this.buffer = new Array(hwm)
    this.mask = hwm - 1
    this.top = 0
    this.btm = 0
    this.next = null
  }

  push (data) {
    if (this.buffer[this.top] !== undefined) return false
    this.buffer[this.top] = data
    this.top = (this.top + 1) & this.mask
    return true
  }

  shift () {
    const last = this.buffer[this.btm]
    if (last === undefined) return undefined
    this.buffer[this.btm] = undefined
    this.btm = (this.btm + 1) & this.mask
    return last
  }

  peek () {
    return this.buffer[this.btm]
  }

  isEmpty () {
    return this.buffer[this.btm] === undefined
  }
}


/***/ }),

/***/ 1607:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const FixedFIFO = __webpack_require__(3975)

module.exports = class FastFIFO {
  constructor (hwm) {
    this.hwm = hwm || 16
    this.head = new FixedFIFO(this.hwm)
    this.tail = this.head
  }

  push (val) {
    if (!this.head.push(val)) {
      const prev = this.head
      this.head = prev.next = new FixedFIFO(2 * this.head.buffer.length)
      this.head.push(val)
    }
  }

  shift () {
    const val = this.tail.shift()
    if (val === undefined && this.tail.next) {
      const next = this.tail.next
      this.tail.next = null
      this.tail = next
      return this.tail.shift()
    }
    return val
  }

  peek () {
    return this.tail.peek()
  }

  isEmpty () {
    return this.head.isEmpty()
  }
}


/***/ }),

/***/ 3811:
/***/ (() => {

if (typeof ReadableStream !== 'undefined' && !ReadableStream.prototype[Symbol.asyncIterator]) {
  ReadableStream.prototype[Symbol.asyncIterator] = function () {
    const reader = this.getReader()
    let last = reader.read()
    return {
      next () {
        const temp = last
        last = reader.read()
        return temp
      },
      return () {
        last.then(() => reader.releaseLock())
      },
      throw (err) {
        this.return()
        throw err
      },
      [Symbol.asyncIterator] () {
        return this
      }
    }
  }
}


/***/ }),

/***/ 5177:
/***/ ((module) => {

// originally pulled out of simple-peer

module.exports = function getBrowserRTC () {
  if (typeof globalThis === 'undefined') return null
  var wrtc = {
    RTCPeerConnection: globalThis.RTCPeerConnection || globalThis.mozRTCPeerConnection ||
      globalThis.webkitRTCPeerConnection,
    RTCSessionDescription: globalThis.RTCSessionDescription ||
      globalThis.mozRTCSessionDescription || globalThis.webkitRTCSessionDescription,
    RTCIceCandidate: globalThis.RTCIceCandidate || globalThis.mozRTCIceCandidate ||
      globalThis.webkitRTCIceCandidate
  }
  if (!wrtc.RTCPeerConnection) return null
  return wrtc
}


/***/ }),

/***/ 4137:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(8764)["Buffer"];

const idb = __webpack_require__(3029)

const EventEmitter = (__webpack_require__(7187).EventEmitter)
const queueMicrotask = __webpack_require__(4375)

class Storage extends EventEmitter {
  constructor (chunkLength, opts) {
    if (!opts) opts = {}
    super()

    this.chunkLength = Number(chunkLength)
    if (!this.chunkLength) throw new Error('First argument must be a chunk length')

    this.closed = false
    this.destroyed = false
    this.length = Number(opts.length) || Infinity
    this.name = opts.name || 'idb-chunk-store'

    if (this.length !== Infinity) {
      this.lastChunkLength = (this.length % this.chunkLength) || this.chunkLength
      this.lastChunkIndex = Math.ceil(this.length / this.chunkLength) - 1
    }

    this.dbPromise = idb.openDB(this.name, undefined, {
      upgrade: (db) => {
        db.createObjectStore('chunks')
      },
      blocking: () => {
        // Fires if the database is deleted from outside this Storage object
        this.close()
      },
      terminated: () => {
        this.closed = true
        this.emit('error', new Error('Database unexpectedly closed'))
      }
    })
  }

  put (index, buf, cb = () => {}) {
    if (this.closed) return queueMicrotask(() => cb(new Error('Storage is closed')))

    const isLastChunk = (index === this.lastChunkIndex)
    if (isLastChunk && buf.length !== this.lastChunkLength) {
      return queueMicrotask(() => cb(new Error('Last chunk length must be ' + this.lastChunkLength)))
    }
    if (!isLastChunk && buf.length !== this.chunkLength) {
      return queueMicrotask(() => cb(new Error('Chunk length must be ' + this.chunkLength)))
    }

    // Zero-copy coerce Buffer to Uint8Array
    buf = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)

    // If the backing buffer is larger, copy out only the relevant slice
    // so extra data doesn't get saved to indexeddb
    if (buf.byteOffset !== 0 || buf.byteLength !== buf.buffer.byteLength) {
      buf = buf.slice()
    }

    ;(async () => {
      try {
        const db = await this.dbPromise
        await db.put('chunks', buf, index)
      } catch (err) {
        cb(err)
        return
      }

      cb(null)
    })()
  }

  get (index, opts, cb = () => {}) {
    if (typeof opts === 'function') return this.get(index, {}, opts)
    if (!opts) opts = {}
    if (this.closed) return queueMicrotask(() => cb(new Error('Storage is closed')))

    ;(async () => {
      let rawResult
      try {
        const db = await this.dbPromise
        rawResult = await db.get('chunks', index)
      } catch (err) {
        cb(err)
        return
      }

      // rawResult should be undefined if the chunk is not found,
      // but some old browsers occasionally return null
      if (rawResult == null) {
        const err = new Error('Chunk not found')
        err.notFound = true
        cb(err)
        return
      }

      let buf = Buffer.from(rawResult.buffer, rawResult.byteOffset, rawResult.byteLength)

      const offset = opts.offset || 0
      const len = opts.length || (buf.length - offset)

      if (offset !== 0 || len !== buf.length) {
        buf = buf.slice(offset, len + offset)
      }

      cb(null, buf)
    })()
  }

  close (cb = () => {}) {
    if (this.closed) return queueMicrotask(() => cb(new Error('Storage is closed')))
    this.closed = true

    ;(async () => {
      try {
        const db = await this.dbPromise
        db.close()
      } catch (err) {
        cb(err)
        return
      }

      cb(null)
    })()
  }

  destroy (cb = () => {}) {
    if (this.closed) return queueMicrotask(() => cb(new Error('Storage is closed')))
    if (this.destroyed) return queueMicrotask(() => cb(new Error('Storage is destroyed')))
    this.destroyed = true

    this.close(async (err) => {
      if (err) {
        cb(err)
        return
      }

      try {
        await idb.deleteDB(this.name)
      } catch (err) {
        cb(err)
        return
      }

      cb(null)
    })
  }
}
module.exports = Storage


/***/ }),

/***/ 3029:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "deleteDB": () => (/* binding */ deleteDB),
  "openDB": () => (/* binding */ openDB),
  "unwrap": () => (/* reexport */ unwrap),
  "wrap": () => (/* reexport */ wrap)
});

;// CONCATENATED MODULE: ./node_modules/idb/build/esm/wrap-idb-value.js
const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

let idbProxyableTypes;
let cursorAdvanceMethods;
// This is a function to prevent it throwing up in node environments.
function getIdbProxyableTypes() {
    return (idbProxyableTypes ||
        (idbProxyableTypes = [
            IDBDatabase,
            IDBObjectStore,
            IDBIndex,
            IDBCursor,
            IDBTransaction,
        ]));
}
// This is a function to prevent it throwing up in node environments.
function getCursorAdvanceMethods() {
    return (cursorAdvanceMethods ||
        (cursorAdvanceMethods = [
            IDBCursor.prototype.advance,
            IDBCursor.prototype.continue,
            IDBCursor.prototype.continuePrimaryKey,
        ]));
}
const cursorRequestMap = new WeakMap();
const transactionDoneMap = new WeakMap();
const transactionStoreNamesMap = new WeakMap();
const transformCache = new WeakMap();
const reverseTransformCache = new WeakMap();
function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
        const unlisten = () => {
            request.removeEventListener('success', success);
            request.removeEventListener('error', error);
        };
        const success = () => {
            resolve(wrap(request.result));
            unlisten();
        };
        const error = () => {
            reject(request.error);
            unlisten();
        };
        request.addEventListener('success', success);
        request.addEventListener('error', error);
    });
    promise
        .then((value) => {
        // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
        // (see wrapFunction).
        if (value instanceof IDBCursor) {
            cursorRequestMap.set(value, request);
        }
        // Catching to avoid "Uncaught Promise exceptions"
    })
        .catch(() => { });
    // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
    // is because we create many promises from a single IDBRequest.
    reverseTransformCache.set(promise, request);
    return promise;
}
function cacheDonePromiseForTransaction(tx) {
    // Early bail if we've already created a done promise for this transaction.
    if (transactionDoneMap.has(tx))
        return;
    const done = new Promise((resolve, reject) => {
        const unlisten = () => {
            tx.removeEventListener('complete', complete);
            tx.removeEventListener('error', error);
            tx.removeEventListener('abort', error);
        };
        const complete = () => {
            resolve();
            unlisten();
        };
        const error = () => {
            reject(tx.error || new DOMException('AbortError', 'AbortError'));
            unlisten();
        };
        tx.addEventListener('complete', complete);
        tx.addEventListener('error', error);
        tx.addEventListener('abort', error);
    });
    // Cache it for later retrieval.
    transactionDoneMap.set(tx, done);
}
let idbProxyTraps = {
    get(target, prop, receiver) {
        if (target instanceof IDBTransaction) {
            // Special handling for transaction.done.
            if (prop === 'done')
                return transactionDoneMap.get(target);
            // Polyfill for objectStoreNames because of Edge.
            if (prop === 'objectStoreNames') {
                return target.objectStoreNames || transactionStoreNamesMap.get(target);
            }
            // Make tx.store return the only store in the transaction, or undefined if there are many.
            if (prop === 'store') {
                return receiver.objectStoreNames[1]
                    ? undefined
                    : receiver.objectStore(receiver.objectStoreNames[0]);
            }
        }
        // Else transform whatever we get back.
        return wrap(target[prop]);
    },
    set(target, prop, value) {
        target[prop] = value;
        return true;
    },
    has(target, prop) {
        if (target instanceof IDBTransaction &&
            (prop === 'done' || prop === 'store')) {
            return true;
        }
        return prop in target;
    },
};
function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
    // Due to expected object equality (which is enforced by the caching in `wrap`), we
    // only create one new func per func.
    // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
    if (func === IDBDatabase.prototype.transaction &&
        !('objectStoreNames' in IDBTransaction.prototype)) {
        return function (storeNames, ...args) {
            const tx = func.call(unwrap(this), storeNames, ...args);
            transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
            return wrap(tx);
        };
    }
    // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
    // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
    // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
    // with real promises, so each advance methods returns a new promise for the cursor object, or
    // undefined if the end of the cursor has been reached.
    if (getCursorAdvanceMethods().includes(func)) {
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            func.apply(unwrap(this), args);
            return wrap(cursorRequestMap.get(this));
        };
    }
    return function (...args) {
        // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
        // the original object.
        return wrap(func.apply(unwrap(this), args));
    };
}
function transformCachableValue(value) {
    if (typeof value === 'function')
        return wrapFunction(value);
    // This doesn't return, it just creates a 'done' promise for the transaction,
    // which is later returned for transaction.done (see idbObjectHandler).
    if (value instanceof IDBTransaction)
        cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
        return new Proxy(value, idbProxyTraps);
    // Return the same value back if we're not going to transform it.
    return value;
}
function wrap(value) {
    // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
    // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
    if (value instanceof IDBRequest)
        return promisifyRequest(value);
    // If we've already transformed this value before, reuse the transformed value.
    // This is faster, but it also provides object equality.
    if (transformCache.has(value))
        return transformCache.get(value);
    const newValue = transformCachableValue(value);
    // Not all types are transformed.
    // These may be primitive types, so they can't be WeakMap keys.
    if (newValue !== value) {
        transformCache.set(value, newValue);
        reverseTransformCache.set(newValue, value);
    }
    return newValue;
}
const unwrap = (value) => reverseTransformCache.get(value);



;// CONCATENATED MODULE: ./node_modules/idb/build/esm/index.js



/**
 * Open a database.
 *
 * @param name Name of the database.
 * @param version Schema version.
 * @param callbacks Additional callbacks.
 */
function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = wrap(request);
    if (upgrade) {
        request.addEventListener('upgradeneeded', (event) => {
            upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction));
        });
    }
    if (blocked)
        request.addEventListener('blocked', () => blocked());
    openPromise
        .then((db) => {
        if (terminated)
            db.addEventListener('close', () => terminated());
        if (blocking)
            db.addEventListener('versionchange', () => blocking());
    })
        .catch(() => { });
    return openPromise;
}
/**
 * Delete a database.
 *
 * @param name Name of the database.
 */
function deleteDB(name, { blocked } = {}) {
    const request = indexedDB.deleteDatabase(name);
    if (blocked)
        request.addEventListener('blocked', () => blocked());
    return wrap(request).then(() => undefined);
}

const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
const writeMethods = ['put', 'add', 'delete', 'clear'];
const cachedMethods = new Map();
function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase &&
        !(prop in target) &&
        typeof prop === 'string')) {
        return;
    }
    if (cachedMethods.get(prop))
        return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, '');
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
        !(isWrite || readMethods.includes(targetFuncName))) {
        return;
    }
    const method = async function (storeName, ...args) {
        // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
        const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
        let target = tx.store;
        if (useIndex)
            target = target.index(args.shift());
        // Must reject if op rejects.
        // If it's a write operation, must reject if tx.done rejects.
        // Must reject with op rejection first.
        // Must resolve with op value.
        // Must handle both promises (no unhandled rejections)
        return (await Promise.all([
            target[targetFuncName](...args),
            isWrite && tx.done,
        ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
}
replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
}));




/***/ }),

/***/ 645:
/***/ ((__unused_webpack_module, exports) => {

/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}


/***/ }),

/***/ 3700:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*! immediate-chunk-store. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
// TODO: remove when window.queueMicrotask() is well supported
const queueMicrotask = __webpack_require__(4375)

class ImmediateStore {
  constructor (store) {
    this.store = store
    this.chunkLength = store.chunkLength

    if (!this.store || !this.store.get || !this.store.put) {
      throw new Error('First argument must be abstract-chunk-store compliant')
    }

    this.mem = []
  }

  put (index, buf, cb = () => {}) {
    this.mem[index] = buf
    this.store.put(index, buf, err => {
      this.mem[index] = null
      cb(err)
    })
  }

  get (index, opts, cb = () => {}) {
    if (typeof opts === 'function') return this.get(index, null, opts)

    let buf = this.mem[index]

    // if the chunk isn't in the immediate memory cache
    if (!buf) {
      return this.store.get(index, opts, cb)
    }

    if (!opts) opts = {}

    const offset = opts.offset || 0
    const len = opts.length || (buf.length - offset)

    if (offset !== 0 || len !== buf.length) {
      buf = buf.slice(offset, len + offset)
    }
    queueMicrotask(() => cb(null, buf))
  }

  close (cb = () => {}) {
    this.store.close(cb)
  }

  destroy (cb = () => {}) {
    this.store.destroy(cb)
  }
}

module.exports = ImmediateStore


/***/ }),

/***/ 5717:
/***/ ((module) => {

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}


/***/ }),

/***/ 8225:
/***/ ((module) => {

module.exports = async function * (iterators) {
  for (let iterator of iterators) {
    // can be lazy functions returning streams
    if (typeof iterator === 'function') iterator = iterator()
    yield * iterator
  }
}


/***/ }),

/***/ 1351:
/***/ ((module, exports) => {



const blacklist = [
	// # All
	'^npm-debug\\.log$', // Error log for npm
	'^\\..*\\.swp$', // Swap file for vim state

	// # macOS
	'^\\.DS_Store$', // Stores custom folder attributes
	'^\\.AppleDouble$', // Stores additional file resources
	'^\\.LSOverride$', // Contains the absolute path to the app to be used
	'^Icon\\r$', // Custom Finder icon: http://superuser.com/questions/298785/icon-file-on-os-x-desktop
	'^\\._.*', // Thumbnail
	'^\\.Spotlight-V100(?:$|\\/)', // Directory that might appear on external disk
	'\\.Trashes', // File that might appear on external disk
	'^__MACOSX$', // Resource fork

	// # Linux
	'~$', // Backup file

	// # Windows
	'^Thumbs\\.db$', // Image file cache
	'^ehthumbs\\.db$', // Folder config file
	'^Desktop\\.ini$', // Stores custom folder attributes
	'@eaDir$' // Synology Diskstation "hidden" folder where the server stores thumbnails
];

exports.re = () => {
	throw new Error('`junk.re` was renamed to `junk.regex`');
};

exports.regex = new RegExp(blacklist.join('|'));

exports.is = filename => exports.regex.test(filename);

exports.not = filename => !exports.is(filename);

// TODO: Remove this for the next major release
exports["default"] = module.exports;


/***/ }),

/***/ 5516:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


exports.RateLimiter = __webpack_require__(1114);
exports.TokenBucket = __webpack_require__(4976);


/***/ }),

/***/ 6188:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);
var getMilliseconds = function() {
  if (typeof process !== 'undefined' && process.hrtime) {
    var hrtime = process.hrtime();
    var seconds = hrtime[0];
    var nanoseconds = hrtime[1];

    return seconds * 1e3 +  Math.floor(nanoseconds / 1e6);
  }

  return new Date().getTime();
}

module.exports = getMilliseconds;


/***/ }),

/***/ 1114:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);
var TokenBucket = __webpack_require__(4976);
var getMilliseconds = __webpack_require__(6188);

/**
 * A generic rate limiter. Underneath the hood, this uses a token bucket plus
 * an additional check to limit how many tokens we can remove each interval.
 * @author John Hurliman <jhurliman@jhurliman.org>
 *
 * @param {Number} tokensPerInterval Maximum number of tokens that can be
 *  removed at any given moment and over the course of one interval.
 * @param {String|Number} interval The interval length in milliseconds, or as
 *  one of the following strings: 'second', 'minute', 'hour', day'.
 * @param {Boolean} fireImmediately Optional. Whether or not the callback
 *  will fire immediately when rate limiting is in effect (default is false).
 */
var RateLimiter = function(tokensPerInterval, interval, fireImmediately) {
  this.tokenBucket = new TokenBucket(tokensPerInterval, tokensPerInterval,
    interval, null);

  // Fill the token bucket to start
  this.tokenBucket.content = tokensPerInterval;

  this.curIntervalStart = getMilliseconds();
  this.tokensThisInterval = 0;
  this.fireImmediately = fireImmediately;
};

RateLimiter.prototype = {
  tokenBucket: null,
  curIntervalStart: 0,
  tokensThisInterval: 0,
  fireImmediately: false,

  /**
   * Remove the requested number of tokens and fire the given callback. If the
   * rate limiter contains enough tokens and we haven't spent too many tokens
   * in this interval already, this will happen immediately. Otherwise, the
   * removal and callback will happen when enough tokens become available.
   * @param {Number} count The number of tokens to remove.
   * @param {Function} callback(err, remainingTokens)
   * @returns {Boolean} True if the callback was fired immediately, otherwise
   *  false.
   */
  removeTokens: function(count, callback) {
    // Make sure the request isn't for more than we can handle
    if (count > this.tokenBucket.bucketSize) {
      process.nextTick(callback.bind(null, 'Requested tokens ' + count +
        ' exceeds maximum tokens per interval ' + this.tokenBucket.bucketSize,
        null));
      return false;
    }

    var self = this;
    var now = getMilliseconds();

    // Advance the current interval and reset the current interval token count
    // if needed
    if (now < this.curIntervalStart
      || now - this.curIntervalStart >= this.tokenBucket.interval) {
      this.curIntervalStart = now;
      this.tokensThisInterval = 0;
    }

    // If we don't have enough tokens left in this interval, wait until the
    // next interval
    if (count > this.tokenBucket.tokensPerInterval - this.tokensThisInterval) {
      if (this.fireImmediately) {
        process.nextTick(callback.bind(null, null, -1));
      } else {
        var waitInterval = Math.ceil(
          this.curIntervalStart + this.tokenBucket.interval - now);

        setTimeout(function() {
          self.tokenBucket.removeTokens(count, afterTokensRemoved);
        }, waitInterval);
      }
      return false;
    }

    // Remove the requested number of tokens from the token bucket
    return this.tokenBucket.removeTokens(count, afterTokensRemoved);

    function afterTokensRemoved(err, tokensRemaining) {
      if (err) return callback(err, null);

      self.tokensThisInterval += count;
      callback(null, tokensRemaining);
    }
  },

  /**
   * Attempt to remove the requested number of tokens and return immediately.
   * If the bucket (and any parent buckets) contains enough tokens and we
   * haven't spent too many tokens in this interval already, this will return
   * true. Otherwise, false is returned.
   * @param {Number} count The number of tokens to remove.
   * @param {Boolean} True if the tokens were successfully removed, otherwise
   *  false.
   */
  tryRemoveTokens: function(count) {
    // Make sure the request isn't for more than we can handle
    if (count > this.tokenBucket.bucketSize)
      return false;

    var now = getMilliseconds();

    // Advance the current interval and reset the current interval token count
    // if needed
    if (now < this.curIntervalStart
      || now - this.curIntervalStart >= this.tokenBucket.interval) {
      this.curIntervalStart = now;
      this.tokensThisInterval = 0;
    }

    // If we don't have enough tokens left in this interval, return false
    if (count > this.tokenBucket.tokensPerInterval - this.tokensThisInterval)
      return false;

    // Try to remove the requested number of tokens from the token bucket
    var removed = this.tokenBucket.tryRemoveTokens(count);
    if (removed) {
      this.tokensThisInterval += count;
    }
    return removed;
  },

  /**
   * Returns the number of tokens remaining in the TokenBucket.
   * @returns {Number} The number of tokens remaining.
   */
  getTokensRemaining: function () {
    this.tokenBucket.drip();
    return this.tokenBucket.content;
  }
};

module.exports = RateLimiter;


/***/ }),

/***/ 4976:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);

/**
 * A hierarchical token bucket for rate limiting. See
 * http://en.wikipedia.org/wiki/Token_bucket for more information.
 * @author John Hurliman <jhurliman@cull.tv>
 *
 * @param {Number} bucketSize Maximum number of tokens to hold in the bucket.
 *  Also known as the burst rate.
 * @param {Number} tokensPerInterval Number of tokens to drip into the bucket
 *  over the course of one interval.
 * @param {String|Number} interval The interval length in milliseconds, or as
 *  one of the following strings: 'second', 'minute', 'hour', day'.
 * @param {TokenBucket} parentBucket Optional. A token bucket that will act as
 *  the parent of this bucket.
 */
var TokenBucket = function(bucketSize, tokensPerInterval, interval, parentBucket) {
  this.bucketSize = bucketSize;
  this.tokensPerInterval = tokensPerInterval;

  if (typeof interval === 'string') {
    switch (interval) {
      case 'sec': case 'second':
        this.interval = 1000; break;
      case 'min': case 'minute':
        this.interval = 1000 * 60; break;
      case 'hr': case 'hour':
        this.interval = 1000 * 60 * 60; break;
      case 'day':
        this.interval = 1000 * 60 * 60 * 24; break;
      default:
        throw new Error('Invaid interval ' + interval);
    }
  } else {
    this.interval = interval;
  }

  this.parentBucket = parentBucket;
  this.content = 0;
  this.lastDrip = +new Date();
};

TokenBucket.prototype = {
  bucketSize: 1,
  tokensPerInterval: 1,
  interval: 1000,
  parentBucket: null,
  content: 0,
  lastDrip: 0,

  /**
   * Remove the requested number of tokens and fire the given callback. If the
   * bucket (and any parent buckets) contains enough tokens this will happen
   * immediately. Otherwise, the removal and callback will happen when enough
   * tokens become available.
   * @param {Number} count The number of tokens to remove.
   * @param {Function} callback(err, remainingTokens)
   * @returns {Boolean} True if the callback was fired immediately, otherwise
   *  false.
   */
  removeTokens: function(count, callback) {
    var self = this;

    // Is this an infinite size bucket?
    if (!this.bucketSize) {
      process.nextTick(callback.bind(null, null, count, Number.POSITIVE_INFINITY));
      return true;
    }

    // Make sure the bucket can hold the requested number of tokens
    if (count > this.bucketSize) {
      process.nextTick(callback.bind(null, 'Requested tokens ' + count + ' exceeds bucket size ' +
        this.bucketSize, null));
      return false;
    }

    // Drip new tokens into this bucket
    this.drip();

    // If we don't have enough tokens in this bucket, come back later
    if (count > this.content)
      return comeBackLater();

    if (this.parentBucket) {
      // Remove the requested from the parent bucket first
      return this.parentBucket.removeTokens(count, function(err, remainingTokens) {
        if (err) return callback(err, null);

        // Check that we still have enough tokens in this bucket
        if (count > self.content)
          return comeBackLater();

        // Tokens were removed from the parent bucket, now remove them from
        // this bucket and fire the callback. Note that we look at the current
        // bucket and parent bucket's remaining tokens and return the smaller
        // of the two values
        self.content -= count;
        callback(null, Math.min(remainingTokens, self.content));
      });
    } else {
      // Remove the requested tokens from this bucket and fire the callback
      this.content -= count;
      process.nextTick(callback.bind(null, null, this.content));
      return true;
    }

    function comeBackLater() {
      // How long do we need to wait to make up the difference in tokens?
      var waitInterval = Math.ceil(
        (count - self.content) * (self.interval / self.tokensPerInterval));
      setTimeout(function() { self.removeTokens(count, callback); }, waitInterval);
      return false;
    }
  },

  /**
   * Attempt to remove the requested number of tokens and return immediately.
   * If the bucket (and any parent buckets) contains enough tokens this will
   * return true, otherwise false is returned.
   * @param {Number} count The number of tokens to remove.
   * @param {Boolean} True if the tokens were successfully removed, otherwise
   *  false.
   */
  tryRemoveTokens: function(count) {
    // Is this an infinite size bucket?
    if (!this.bucketSize)
      return true;

    // Make sure the bucket can hold the requested number of tokens
    if (count > this.bucketSize)
      return false;

    // Drip new tokens into this bucket
    this.drip();

    // If we don't have enough tokens in this bucket, return false
    if (count > this.content)
      return false;

    // Try to remove the requested tokens from the parent bucket
    if (this.parentBucket && !this.parentBucket.tryRemoveTokens(count))
      return false;

    // Remove the requested tokens from this bucket and return
    this.content -= count;
    return true;
  },

  /**
   * Add any new tokens to the bucket since the last drip.
   * @returns {Boolean} True if new tokens were added, otherwise false.
   */
  drip: function() {
    if (!this.tokensPerInterval) {
      this.content = this.bucketSize;
      return;
    }

    var now = +new Date();
    var deltaMS = Math.max(now - this.lastDrip, 0);
    this.lastDrip = now;

    var dripAmount = deltaMS * (this.tokensPerInterval / this.interval);
    this.content = Math.min(this.content + dripAmount, this.bucketSize);
  }
};

module.exports = TokenBucket;


/***/ }),

/***/ 7117:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var events = __webpack_require__(7187)
var inherits = __webpack_require__(5717)

module.exports = LRU

function LRU (opts) {
  if (!(this instanceof LRU)) return new LRU(opts)
  if (typeof opts === 'number') opts = {max: opts}
  if (!opts) opts = {}
  events.EventEmitter.call(this)
  this.cache = {}
  this.head = this.tail = null
  this.length = 0
  this.max = opts.max || 1000
  this.maxAge = opts.maxAge || 0
}

inherits(LRU, events.EventEmitter)

Object.defineProperty(LRU.prototype, 'keys', {
  get: function () { return Object.keys(this.cache) }
})

LRU.prototype.clear = function () {
  this.cache = {}
  this.head = this.tail = null
  this.length = 0
}

LRU.prototype.remove = function (key) {
  if (typeof key !== 'string') key = '' + key
  if (!this.cache.hasOwnProperty(key)) return

  var element = this.cache[key]
  delete this.cache[key]
  this._unlink(key, element.prev, element.next)
  return element.value
}

LRU.prototype._unlink = function (key, prev, next) {
  this.length--

  if (this.length === 0) {
    this.head = this.tail = null
  } else {
    if (this.head === key) {
      this.head = prev
      this.cache[this.head].next = null
    } else if (this.tail === key) {
      this.tail = next
      this.cache[this.tail].prev = null
    } else {
      this.cache[prev].next = next
      this.cache[next].prev = prev
    }
  }
}

LRU.prototype.peek = function (key) {
  if (!this.cache.hasOwnProperty(key)) return

  var element = this.cache[key]

  if (!this._checkAge(key, element)) return
  return element.value
}

LRU.prototype.set = function (key, value) {
  if (typeof key !== 'string') key = '' + key

  var element

  if (this.cache.hasOwnProperty(key)) {
    element = this.cache[key]
    element.value = value
    if (this.maxAge) element.modified = Date.now()

    // If it's already the head, there's nothing more to do:
    if (key === this.head) return value
    this._unlink(key, element.prev, element.next)
  } else {
    element = {value: value, modified: 0, next: null, prev: null}
    if (this.maxAge) element.modified = Date.now()
    this.cache[key] = element

    // Eviction is only possible if the key didn't already exist:
    if (this.length === this.max) this.evict()
  }

  this.length++
  element.next = null
  element.prev = this.head

  if (this.head) this.cache[this.head].next = key
  this.head = key

  if (!this.tail) this.tail = key
  return value
}

LRU.prototype._checkAge = function (key, element) {
  if (this.maxAge && (Date.now() - element.modified) > this.maxAge) {
    this.remove(key)
    this.emit('evict', {key: key, value: element.value})
    return false
  }
  return true
}

LRU.prototype.get = function (key) {
  if (typeof key !== 'string') key = '' + key
  if (!this.cache.hasOwnProperty(key)) return

  var element = this.cache[key]

  if (!this._checkAge(key, element)) return

  if (this.head !== key) {
    if (key === this.tail) {
      this.tail = element.next
      this.cache[this.tail].prev = null
    } else {
      // Set prev.next -> element.next:
      this.cache[element.prev].next = element.next
    }

    // Set element.next.prev -> element.prev:
    this.cache[element.next].prev = element.prev

    // Element is the new head
    this.cache[this.head].next = key
    element.prev = this.head
    element.next = null
    this.head = key
  }

  return element.value
}

LRU.prototype.evict = function () {
  if (!this.tail) return
  var key = this.tail
  var value = this.remove(this.tail)
  this.emit('evict', {key: key, value: value})
}


/***/ }),

/***/ 9417:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(8764)["Buffer"];
/*! lt_donthave. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */
const arrayRemove = __webpack_require__(6581)
const { EventEmitter } = __webpack_require__(7187)
const debug = __webpack_require__(1227)('lt_donthave')

module.exports = () => {
  class ltDontHave extends EventEmitter {
    constructor (wire) {
      super()

      this._peerSupports = false
      this._wire = wire
    }

    onExtendedHandshake () {
      this._peerSupports = true
    }

    onMessage (buf) {
      let index
      try {
        index = buf.readUInt32BE()
      } catch (err) {
        // drop invalid messages
        return
      }

      if (!this._wire.peerPieces.get(index)) return
      debug('got donthave %d', index)
      this._wire.peerPieces.set(index, false)

      this.emit('donthave', index)
      this._failRequests(index)
    }

    donthave (index) {
      if (!this._peerSupports) return

      debug('donthave %d', index)
      const buf = Buffer.alloc(4)
      buf.writeUInt32BE(index)

      this._wire.extended('lt_donthave', buf)
    }

    _failRequests (index) {
      const requests = this._wire.requests
      for (let i = 0; i < requests.length; i++) {
        const req = requests[i]
        if (req.piece === index) {
          arrayRemove(requests, i)
          i -= 1 // Check the new value at the same slot
          this._wire._callback(req, new Error('peer sent donthave'), null)
        }
      }
    }
  }

  // Name of the bittorrent-protocol extension
  ltDontHave.prototype.name = 'lt_donthave'

  return ltDontHave
}


/***/ }),

/***/ 1191:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = Storage

const queueMicrotask = __webpack_require__(4375)

function Storage (chunkLength, opts) {
  if (!(this instanceof Storage)) return new Storage(chunkLength, opts)
  if (!opts) opts = {}

  this.chunkLength = Number(chunkLength)
  if (!this.chunkLength) throw new Error('First argument must be a chunk length')

  this.chunks = []
  this.closed = false
  this.length = Number(opts.length) || Infinity

  if (this.length !== Infinity) {
    this.lastChunkLength = (this.length % this.chunkLength) || this.chunkLength
    this.lastChunkIndex = Math.ceil(this.length / this.chunkLength) - 1
  }
}

Storage.prototype.put = function (index, buf, cb = () => {}) {
  if (this.closed) return queueMicrotask(() => cb(new Error('Storage is closed')))

  const isLastChunk = (index === this.lastChunkIndex)
  if (isLastChunk && buf.length !== this.lastChunkLength) {
    return queueMicrotask(() => cb(new Error('Last chunk length must be ' + this.lastChunkLength)))
  }
  if (!isLastChunk && buf.length !== this.chunkLength) {
    return queueMicrotask(() => cb(new Error('Chunk length must be ' + this.chunkLength)))
  }
  this.chunks[index] = buf
  queueMicrotask(() => cb(null))
}

Storage.prototype.get = function (index, opts, cb = () => {}) {
  if (typeof opts === 'function') return this.get(index, null, opts)
  if (this.closed) return queueMicrotask(() => cb(new Error('Storage is closed')))

  let buf = this.chunks[index]

  if (!buf) {
    const err = new Error('Chunk not found')
    err.notFound = true
    return queueMicrotask(() => cb(err))
  }

  if (!opts) opts = {}

  const offset = opts.offset || 0
  const len = opts.length || (buf.length - offset)

  if (offset !== 0 || len !== buf.length) {
    buf = buf.slice(offset, len + offset)
  }

  queueMicrotask(() => cb(null, buf))
}

Storage.prototype.close = Storage.prototype.destroy = function (cb = () => {}) {
  if (this.closed) return queueMicrotask(() => cb(new Error('Storage is closed')))
  this.closed = true
  this.chunks = null
  queueMicrotask(() => cb(null))
}


/***/ }),

/***/ 9146:
/***/ ((module) => {



/**
 * @param typeMap [Object] Map of MIME type -> Array[extensions]
 * @param ...
 */
function Mime() {
  this._types = Object.create(null);
  this._extensions = Object.create(null);

  for (let i = 0; i < arguments.length; i++) {
    this.define(arguments[i]);
  }

  this.define = this.define.bind(this);
  this.getType = this.getType.bind(this);
  this.getExtension = this.getExtension.bind(this);
}

/**
 * Define mimetype -> extension mappings.  Each key is a mime-type that maps
 * to an array of extensions associated with the type.  The first extension is
 * used as the default extension for the type.
 *
 * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
 *
 * If a type declares an extension that has already been defined, an error will
 * be thrown.  To suppress this error and force the extension to be associated
 * with the new type, pass `force`=true.  Alternatively, you may prefix the
 * extension with "*" to map the type to extension, without mapping the
 * extension to the type.
 *
 * e.g. mime.define({'audio/wav', ['wav']}, {'audio/x-wav', ['*wav']});
 *
 *
 * @param map (Object) type definitions
 * @param force (Boolean) if true, force overriding of existing definitions
 */
Mime.prototype.define = function(typeMap, force) {
  for (let type in typeMap) {
    let extensions = typeMap[type].map(function(t) {
      return t.toLowerCase();
    });
    type = type.toLowerCase();

    for (let i = 0; i < extensions.length; i++) {
      const ext = extensions[i];

      // '*' prefix = not the preferred type for this extension.  So fixup the
      // extension, and skip it.
      if (ext[0] === '*') {
        continue;
      }

      if (!force && (ext in this._types)) {
        throw new Error(
          'Attempt to change mapping for "' + ext +
          '" extension from "' + this._types[ext] + '" to "' + type +
          '". Pass `force=true` to allow this, otherwise remove "' + ext +
          '" from the list of extensions for "' + type + '".'
        );
      }

      this._types[ext] = type;
    }

    // Use first extension as default
    if (force || !this._extensions[type]) {
      const ext = extensions[0];
      this._extensions[type] = (ext[0] !== '*') ? ext : ext.substr(1);
    }
  }
};

/**
 * Lookup a mime type based on extension
 */
Mime.prototype.getType = function(path) {
  path = String(path);
  let last = path.replace(/^.*[/\\]/, '').toLowerCase();
  let ext = last.replace(/^.*\./, '').toLowerCase();

  let hasPath = last.length < path.length;
  let hasDot = ext.length < last.length - 1;

  return (hasDot || !hasPath) && this._types[ext] || null;
};

/**
 * Return file extension associated with a mime type
 */
Mime.prototype.getExtension = function(type) {
  type = /^\s*([^;\s]*)/.test(type) && RegExp.$1;
  return type && this._extensions[type.toLowerCase()] || null;
};

module.exports = Mime;


/***/ }),

/***/ 2109:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



let Mime = __webpack_require__(9146);
module.exports = new Mime(__webpack_require__(4415));


/***/ }),

/***/ 4415:
/***/ ((module) => {

module.exports = {"application/andrew-inset":["ez"],"application/applixware":["aw"],"application/atom+xml":["atom"],"application/atomcat+xml":["atomcat"],"application/atomdeleted+xml":["atomdeleted"],"application/atomsvc+xml":["atomsvc"],"application/atsc-dwd+xml":["dwd"],"application/atsc-held+xml":["held"],"application/atsc-rsat+xml":["rsat"],"application/bdoc":["bdoc"],"application/calendar+xml":["xcs"],"application/ccxml+xml":["ccxml"],"application/cdfx+xml":["cdfx"],"application/cdmi-capability":["cdmia"],"application/cdmi-container":["cdmic"],"application/cdmi-domain":["cdmid"],"application/cdmi-object":["cdmio"],"application/cdmi-queue":["cdmiq"],"application/cu-seeme":["cu"],"application/dash+xml":["mpd"],"application/davmount+xml":["davmount"],"application/docbook+xml":["dbk"],"application/dssc+der":["dssc"],"application/dssc+xml":["xdssc"],"application/ecmascript":["es","ecma"],"application/emma+xml":["emma"],"application/emotionml+xml":["emotionml"],"application/epub+zip":["epub"],"application/exi":["exi"],"application/express":["exp"],"application/fdt+xml":["fdt"],"application/font-tdpfr":["pfr"],"application/geo+json":["geojson"],"application/gml+xml":["gml"],"application/gpx+xml":["gpx"],"application/gxf":["gxf"],"application/gzip":["gz"],"application/hjson":["hjson"],"application/hyperstudio":["stk"],"application/inkml+xml":["ink","inkml"],"application/ipfix":["ipfix"],"application/its+xml":["its"],"application/java-archive":["jar","war","ear"],"application/java-serialized-object":["ser"],"application/java-vm":["class"],"application/javascript":["js","mjs"],"application/json":["json","map"],"application/json5":["json5"],"application/jsonml+json":["jsonml"],"application/ld+json":["jsonld"],"application/lgr+xml":["lgr"],"application/lost+xml":["lostxml"],"application/mac-binhex40":["hqx"],"application/mac-compactpro":["cpt"],"application/mads+xml":["mads"],"application/manifest+json":["webmanifest"],"application/marc":["mrc"],"application/marcxml+xml":["mrcx"],"application/mathematica":["ma","nb","mb"],"application/mathml+xml":["mathml"],"application/mbox":["mbox"],"application/mediaservercontrol+xml":["mscml"],"application/metalink+xml":["metalink"],"application/metalink4+xml":["meta4"],"application/mets+xml":["mets"],"application/mmt-aei+xml":["maei"],"application/mmt-usd+xml":["musd"],"application/mods+xml":["mods"],"application/mp21":["m21","mp21"],"application/mp4":["mp4s","m4p"],"application/msword":["doc","dot"],"application/mxf":["mxf"],"application/n-quads":["nq"],"application/n-triples":["nt"],"application/node":["cjs"],"application/octet-stream":["bin","dms","lrf","mar","so","dist","distz","pkg","bpk","dump","elc","deploy","exe","dll","deb","dmg","iso","img","msi","msp","msm","buffer"],"application/oda":["oda"],"application/oebps-package+xml":["opf"],"application/ogg":["ogx"],"application/omdoc+xml":["omdoc"],"application/onenote":["onetoc","onetoc2","onetmp","onepkg"],"application/oxps":["oxps"],"application/p2p-overlay+xml":["relo"],"application/patch-ops-error+xml":["xer"],"application/pdf":["pdf"],"application/pgp-encrypted":["pgp"],"application/pgp-signature":["asc","sig"],"application/pics-rules":["prf"],"application/pkcs10":["p10"],"application/pkcs7-mime":["p7m","p7c"],"application/pkcs7-signature":["p7s"],"application/pkcs8":["p8"],"application/pkix-attr-cert":["ac"],"application/pkix-cert":["cer"],"application/pkix-crl":["crl"],"application/pkix-pkipath":["pkipath"],"application/pkixcmp":["pki"],"application/pls+xml":["pls"],"application/postscript":["ai","eps","ps"],"application/provenance+xml":["provx"],"application/pskc+xml":["pskcxml"],"application/raml+yaml":["raml"],"application/rdf+xml":["rdf","owl"],"application/reginfo+xml":["rif"],"application/relax-ng-compact-syntax":["rnc"],"application/resource-lists+xml":["rl"],"application/resource-lists-diff+xml":["rld"],"application/rls-services+xml":["rs"],"application/route-apd+xml":["rapd"],"application/route-s-tsid+xml":["sls"],"application/route-usd+xml":["rusd"],"application/rpki-ghostbusters":["gbr"],"application/rpki-manifest":["mft"],"application/rpki-roa":["roa"],"application/rsd+xml":["rsd"],"application/rss+xml":["rss"],"application/rtf":["rtf"],"application/sbml+xml":["sbml"],"application/scvp-cv-request":["scq"],"application/scvp-cv-response":["scs"],"application/scvp-vp-request":["spq"],"application/scvp-vp-response":["spp"],"application/sdp":["sdp"],"application/senml+xml":["senmlx"],"application/sensml+xml":["sensmlx"],"application/set-payment-initiation":["setpay"],"application/set-registration-initiation":["setreg"],"application/shf+xml":["shf"],"application/sieve":["siv","sieve"],"application/smil+xml":["smi","smil"],"application/sparql-query":["rq"],"application/sparql-results+xml":["srx"],"application/srgs":["gram"],"application/srgs+xml":["grxml"],"application/sru+xml":["sru"],"application/ssdl+xml":["ssdl"],"application/ssml+xml":["ssml"],"application/swid+xml":["swidtag"],"application/tei+xml":["tei","teicorpus"],"application/thraud+xml":["tfi"],"application/timestamped-data":["tsd"],"application/toml":["toml"],"application/trig":["trig"],"application/ttml+xml":["ttml"],"application/ubjson":["ubj"],"application/urc-ressheet+xml":["rsheet"],"application/urc-targetdesc+xml":["td"],"application/voicexml+xml":["vxml"],"application/wasm":["wasm"],"application/widget":["wgt"],"application/winhlp":["hlp"],"application/wsdl+xml":["wsdl"],"application/wspolicy+xml":["wspolicy"],"application/xaml+xml":["xaml"],"application/xcap-att+xml":["xav"],"application/xcap-caps+xml":["xca"],"application/xcap-diff+xml":["xdf"],"application/xcap-el+xml":["xel"],"application/xcap-ns+xml":["xns"],"application/xenc+xml":["xenc"],"application/xhtml+xml":["xhtml","xht"],"application/xliff+xml":["xlf"],"application/xml":["xml","xsl","xsd","rng"],"application/xml-dtd":["dtd"],"application/xop+xml":["xop"],"application/xproc+xml":["xpl"],"application/xslt+xml":["*xsl","xslt"],"application/xspf+xml":["xspf"],"application/xv+xml":["mxml","xhvml","xvml","xvm"],"application/yang":["yang"],"application/yin+xml":["yin"],"application/zip":["zip"],"audio/3gpp":["*3gpp"],"audio/adpcm":["adp"],"audio/amr":["amr"],"audio/basic":["au","snd"],"audio/midi":["mid","midi","kar","rmi"],"audio/mobile-xmf":["mxmf"],"audio/mp3":["*mp3"],"audio/mp4":["m4a","mp4a"],"audio/mpeg":["mpga","mp2","mp2a","mp3","m2a","m3a"],"audio/ogg":["oga","ogg","spx","opus"],"audio/s3m":["s3m"],"audio/silk":["sil"],"audio/wav":["wav"],"audio/wave":["*wav"],"audio/webm":["weba"],"audio/xm":["xm"],"font/collection":["ttc"],"font/otf":["otf"],"font/ttf":["ttf"],"font/woff":["woff"],"font/woff2":["woff2"],"image/aces":["exr"],"image/apng":["apng"],"image/avif":["avif"],"image/bmp":["bmp"],"image/cgm":["cgm"],"image/dicom-rle":["drle"],"image/emf":["emf"],"image/fits":["fits"],"image/g3fax":["g3"],"image/gif":["gif"],"image/heic":["heic"],"image/heic-sequence":["heics"],"image/heif":["heif"],"image/heif-sequence":["heifs"],"image/hej2k":["hej2"],"image/hsj2":["hsj2"],"image/ief":["ief"],"image/jls":["jls"],"image/jp2":["jp2","jpg2"],"image/jpeg":["jpeg","jpg","jpe"],"image/jph":["jph"],"image/jphc":["jhc"],"image/jpm":["jpm"],"image/jpx":["jpx","jpf"],"image/jxr":["jxr"],"image/jxra":["jxra"],"image/jxrs":["jxrs"],"image/jxs":["jxs"],"image/jxsc":["jxsc"],"image/jxsi":["jxsi"],"image/jxss":["jxss"],"image/ktx":["ktx"],"image/ktx2":["ktx2"],"image/png":["png"],"image/sgi":["sgi"],"image/svg+xml":["svg","svgz"],"image/t38":["t38"],"image/tiff":["tif","tiff"],"image/tiff-fx":["tfx"],"image/webp":["webp"],"image/wmf":["wmf"],"message/disposition-notification":["disposition-notification"],"message/global":["u8msg"],"message/global-delivery-status":["u8dsn"],"message/global-disposition-notification":["u8mdn"],"message/global-headers":["u8hdr"],"message/rfc822":["eml","mime"],"model/3mf":["3mf"],"model/gltf+json":["gltf"],"model/gltf-binary":["glb"],"model/iges":["igs","iges"],"model/mesh":["msh","mesh","silo"],"model/mtl":["mtl"],"model/obj":["obj"],"model/step+xml":["stpx"],"model/step+zip":["stpz"],"model/step-xml+zip":["stpxz"],"model/stl":["stl"],"model/vrml":["wrl","vrml"],"model/x3d+binary":["*x3db","x3dbz"],"model/x3d+fastinfoset":["x3db"],"model/x3d+vrml":["*x3dv","x3dvz"],"model/x3d+xml":["x3d","x3dz"],"model/x3d-vrml":["x3dv"],"text/cache-manifest":["appcache","manifest"],"text/calendar":["ics","ifb"],"text/coffeescript":["coffee","litcoffee"],"text/css":["css"],"text/csv":["csv"],"text/html":["html","htm","shtml"],"text/jade":["jade"],"text/jsx":["jsx"],"text/less":["less"],"text/markdown":["markdown","md"],"text/mathml":["mml"],"text/mdx":["mdx"],"text/n3":["n3"],"text/plain":["txt","text","conf","def","list","log","in","ini"],"text/richtext":["rtx"],"text/rtf":["*rtf"],"text/sgml":["sgml","sgm"],"text/shex":["shex"],"text/slim":["slim","slm"],"text/spdx":["spdx"],"text/stylus":["stylus","styl"],"text/tab-separated-values":["tsv"],"text/troff":["t","tr","roff","man","me","ms"],"text/turtle":["ttl"],"text/uri-list":["uri","uris","urls"],"text/vcard":["vcard"],"text/vtt":["vtt"],"text/xml":["*xml"],"text/yaml":["yaml","yml"],"video/3gpp":["3gp","3gpp"],"video/3gpp2":["3g2"],"video/h261":["h261"],"video/h263":["h263"],"video/h264":["h264"],"video/iso.segment":["m4s"],"video/jpeg":["jpgv"],"video/jpm":["*jpm","jpgm"],"video/mj2":["mj2","mjp2"],"video/mp2t":["ts"],"video/mp4":["mp4","mp4v","mpg4"],"video/mpeg":["mpeg","mpg","mpe","m1v","m2v"],"video/ogg":["ogv"],"video/quicktime":["qt","mov"],"video/webm":["webm"]};

/***/ }),

/***/ 7824:
/***/ ((module) => {

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}


/***/ }),

/***/ 778:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var wrappy = __webpack_require__(2479)
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}


/***/ }),

/***/ 6470:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;


/***/ }),

/***/ 3786:
/***/ ((module) => {

module.exports = length

function length (bytes) {
  return Math.max(16384, 1 << Math.log2(bytes < 1024 ? 1 : bytes / 1024) + 0.5 | 0)
}


/***/ }),

/***/ 4286:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);
var once = __webpack_require__(778)
var eos = __webpack_require__(2840)
var fs = __webpack_require__(1156) // we only need fs to get the ReadStream and WriteStream prototypes

var noop = function () {}
var ancient = /^v?\.0/.test(process.version)

var isFn = function (fn) {
  return typeof fn === 'function'
}

var isFS = function (stream) {
  if (!ancient) return false // newer node version do not need to care about fs is a special way
  if (!fs) return false // browser
  return (stream instanceof (fs.ReadStream || noop) || stream instanceof (fs.WriteStream || noop)) && isFn(stream.close)
}

var isRequest = function (stream) {
  return stream.setHeader && isFn(stream.abort)
}

var destroyer = function (stream, reading, writing, callback) {
  callback = once(callback)

  var closed = false
  stream.on('close', function () {
    closed = true
  })

  eos(stream, {readable: reading, writable: writing}, function (err) {
    if (err) return callback(err)
    closed = true
    callback()
  })

  var destroyed = false
  return function (err) {
    if (closed) return
    if (destroyed) return
    destroyed = true

    if (isFS(stream)) return stream.close(noop) // use close for fs streams to avoid fd leaks
    if (isRequest(stream)) return stream.abort() // request.destroy just do .end - .abort is what we want

    if (isFn(stream.destroy)) return stream.destroy()

    callback(err || new Error('stream was destroyed'))
  }
}

var call = function (fn) {
  fn()
}

var pipe = function (from, to) {
  return from.pipe(to)
}

var pump = function () {
  var streams = Array.prototype.slice.call(arguments)
  var callback = isFn(streams[streams.length - 1] || noop) && streams.pop() || noop

  if (Array.isArray(streams[0])) streams = streams[0]
  if (streams.length < 2) throw new Error('pump requires two streams per minimum')

  var error
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1
    var writing = i > 0
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err
      if (err) destroys.forEach(call)
      if (reading) return
      destroys.forEach(call)
      callback(error)
    })
  })

  return streams.reduce(pipe)
}

module.exports = pump


/***/ }),

/***/ 4375:
/***/ ((module) => {

/*! queue-microtask. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
let promise

module.exports = typeof queueMicrotask === 'function'
  ? queueMicrotask.bind(typeof window !== 'undefined' ? window : globalThis)
  // reuse resolved promise, and allocate it lazily
  : cb => (promise || (promise = Promise.resolve()))
    .then(cb)
    .catch(err => setTimeout(() => { throw err }, 0))


/***/ }),

/***/ 3527:
/***/ ((module) => {

module.exports = typeof queueMicrotask === 'function' ? queueMicrotask : (fn) => Promise.resolve().then(fn)


/***/ }),

/***/ 5960:
/***/ ((module) => {

var iterate = function (list) {
  var offset = 0
  return function () {
    if (offset === list.length) return null

    var len = list.length - offset
    var i = (Math.random() * len) | 0
    var el = list[offset + i]

    var tmp = list[offset]
    list[offset] = el
    list[offset + i] = tmp
    offset++

    return el
  }
}

module.exports = iterate


/***/ }),

/***/ 1798:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);


// limit of Crypto.getRandomValues()
// https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
var MAX_BYTES = 65536

// Node supports requesting up to this number of bytes
// https://github.com/nodejs/node/blob/master/lib/internal/crypto/random.js#L48
var MAX_UINT32 = 4294967295

function oldBrowser () {
  throw new Error('Secure random number generation is not supported by this browser.\nUse Chrome, Firefox or Internet Explorer 11')
}

var Buffer = (__webpack_require__(9509).Buffer)
var crypto = globalThis.crypto || globalThis.msCrypto

if (crypto && crypto.getRandomValues) {
  module.exports = randomBytes
} else {
  module.exports = oldBrowser
}

function randomBytes (size, cb) {
  // phantomjs needs to throw
  if (size > MAX_UINT32) throw new RangeError('requested too many random bytes')

  var bytes = Buffer.allocUnsafe(size)

  if (size > 0) {  // getRandomValues fails on IE if size == 0
    if (size > MAX_BYTES) { // this is the max bytes crypto.getRandomValues
      // can do at once see https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
      for (var generated = 0; generated < size; generated += MAX_BYTES) {
        // buffer.slice automatically checks if the end is past the end of
        // the buffer so we don't have to here
        crypto.getRandomValues(bytes.slice(generated, generated + MAX_BYTES))
      }
    } else {
      crypto.getRandomValues(bytes)
    }
  }

  if (typeof cb === 'function') {
    return process.nextTick(function () {
      cb(null, bytes)
    })
  }

  return bytes
}


/***/ }),

/***/ 4622:
/***/ ((module) => {

/*!
 * range-parser
 * Copyright(c) 2012-2014 TJ Holowaychuk
 * Copyright(c) 2015-2016 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module exports.
 * @public
 */

module.exports = rangeParser

/**
 * Parse "Range" header `str` relative to the given file `size`.
 *
 * @param {Number} size
 * @param {String} str
 * @param {Object} [options]
 * @return {Array}
 * @public
 */

function rangeParser (size, str, options) {
  if (typeof str !== 'string') {
    throw new TypeError('argument str must be a string')
  }

  var index = str.indexOf('=')

  if (index === -1) {
    return -2
  }

  // split the range string
  var arr = str.slice(index + 1).split(',')
  var ranges = []

  // add ranges type
  ranges.type = str.slice(0, index)

  // parse all ranges
  for (var i = 0; i < arr.length; i++) {
    var range = arr[i].split('-')
    var start = parseInt(range[0], 10)
    var end = parseInt(range[1], 10)

    // -nnn
    if (isNaN(start)) {
      start = size - end
      end = size - 1
    // nnn-
    } else if (isNaN(end)) {
      end = size - 1
    }

    // limit last-byte-pos to current length
    if (end > size - 1) {
      end = size - 1
    }

    // invalid or unsatisifiable
    if (isNaN(start) || isNaN(end) || start > end || start < 0) {
      continue
    }

    // add range
    ranges.push({
      start: start,
      end: end
    })
  }

  if (ranges.length < 1) {
    // unsatisifiable
    return -1
  }

  return options && options.combine
    ? combineRanges(ranges)
    : ranges
}

/**
 * Combine overlapping & adjacent ranges.
 * @private
 */

function combineRanges (ranges) {
  var ordered = ranges.map(mapWithIndex).sort(sortByRangeStart)

  for (var j = 0, i = 1; i < ordered.length; i++) {
    var range = ordered[i]
    var current = ordered[j]

    if (range.start > current.end + 1) {
      // next range
      ordered[++j] = range
    } else if (range.end > current.end) {
      // extend range
      current.end = range.end
      current.index = Math.min(current.index, range.index)
    }
  }

  // trim ordered array
  ordered.length = j + 1

  // generate combined range
  var combined = ordered.sort(sortByRangeIndex).map(mapWithoutIndex)

  // copy ranges type
  combined.type = ranges.type

  return combined
}

/**
 * Map function to add index value to ranges.
 * @private
 */

function mapWithIndex (range, index) {
  return {
    start: range.start,
    end: range.end,
    index: index
  }
}

/**
 * Map function to remove index value from ranges.
 * @private
 */

function mapWithoutIndex (range) {
  return {
    start: range.start,
    end: range.end
  }
}

/**
 * Sort function to sort ranges by index.
 * @private
 */

function sortByRangeIndex (a, b) {
  return a.index - b.index
}

/**
 * Sort function to sort ranges by start position.
 * @private
 */

function sortByRangeStart (a, b) {
  return a.start - b.start
}


/***/ }),

/***/ 7830:
/***/ ((module) => {



// Based on RC4 algorithm, as described in
// http://en.wikipedia.org/wiki/RC4

function isInteger(n) {
  return parseInt(n, 10) === n;
}

function createRC4(N) {
  function identityPermutation() {
    var s = new Array(N);
    for (var i = 0; i < N; i++) {
      s[i] = i;
    }
    return s;
  }

  // :: string | array integer -> array integer
  function seed(key) {
    if (key === undefined) {
      key = new Array(N);
      for (var k = 0; k < N; k++) {
        key[k] = Math.floor(Math.random() * N);
      }
    } else if (typeof key === "string") {
      // to string
      key = "" + key;
      key = key.split("").map(function (c) { return c.charCodeAt(0) % N; });
    } else if (Array.isArray(key)) {
      if (!key.every(function (v) {
        return typeof v === "number" && v === (v | 0);
      })) {
        throw new TypeError("invalid seed key specified: not array of integers");
      }
    } else {
      throw new TypeError("invalid seed key specified");
    }

    var keylen = key.length;

    // resed state
    var s = identityPermutation();

    var j = 0;
    for (var i = 0; i < N; i++) {
      j = (j + s[i] + key[i % keylen]) % N;
      var tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
    }

    return s;
  }

  /* eslint-disable no-shadow */
  function RC4(key) {
    this.s = seed(key);
    this.i = 0;
    this.j = 0;
  }
  /* eslint-enable no-shadow */

  RC4.prototype.randomNative = function () {
    this.i = (this.i + 1) % N;
    this.j = (this.j + this.s[this.i]) % N;

    var tmp = this.s[this.i];
    this.s[this.i] = this.s[this.j];
    this.s[this.j] = tmp;

    var k = this.s[(this.s[this.i] + this.s[this.j]) % N];

    return k;
  };

  RC4.prototype.randomUInt32 = function () {
    var a = this.randomByte();
    var b = this.randomByte();
    var c = this.randomByte();
    var d = this.randomByte();

    return ((a * 256 + b) * 256 + c) * 256 + d;
  };

  RC4.prototype.randomFloat = function () {
    return this.randomUInt32() / 0x100000000;
  };

  RC4.prototype.random = function () {
    var a;
    var b;

    if (arguments.length === 1) {
      a = 0;
      b = arguments[0];
    } else if (arguments.length === 2) {
      a = arguments[0];
      b = arguments[1];
    } else {
      throw new TypeError("random takes one or two integer arguments");
    }

    if (!isInteger(a) || !isInteger(b)) {
      throw new TypeError("random takes one or two integer arguments");
    }

    return a + this.randomUInt32() % (b - a + 1);
  };

  RC4.prototype.currentState = function () {
    return {
      i: this.i,
      j: this.j,
      s: this.s.slice(), // copy
    };
  };

  RC4.prototype.setState = function (state) {
    var s = state.s;
    var i = state.i;
    var j = state.j;

    /* eslint-disable yoda */
    if (!(i === (i | 0) && 0 <= i && i < N)) {
      throw new Error("state.i should be integer [0, " + (N - 1) + "]");
    }

    if (!(j === (j | 0) && 0 <= j && j < N)) {
      throw new Error("state.j should be integer [0, " + (N - 1) + "]");
    }
    /* eslint-enable yoda */

    // check length
    if (!Array.isArray(s) || s.length !== N) {
      throw new Error("state should be array of length " + N);
    }

    // check that all params are there
    for (var k = 0; k < N; k++) {
      if (s.indexOf(k) === -1) {
        throw new Error("state should be permutation of 0.." + (N - 1) + ": " + k + " is missing");
      }
    }

    this.i = i;
    this.j = j;
    this.s = s.slice(); // assign copy
  };

  return RC4;
}

var RC4 = createRC4(256);
RC4.prototype.randomByte = RC4.prototype.randomNative;

var RC4small = createRC4(16);
RC4small.prototype.randomByte = function () {
  var a = this.randomNative();
  var b = this.randomNative();

  return a * 16 + b;
};

var ordA = "a".charCodeAt(0);
var ord0 = "0".charCodeAt(0);

function toHex(n) {
  return n < 10 ? String.fromCharCode(ord0 + n) : String.fromCharCode(ordA + n - 10);
}

function fromHex(c) {
  return parseInt(c, 16);
}

RC4small.prototype.currentStateString = function () {
  var state = this.currentState();

  var i = toHex(state.i);
  var j = toHex(state.j);

  var res = i + j + state.s.map(toHex).join("");
  return res;
};

RC4small.prototype.setStateString = function (stateString) {
  if (!stateString.match(/^[0-9a-f]{18}$/)) {
    throw new TypeError("RC4small stateString should be 18 hex character string");
  }

  var i = fromHex(stateString[0]);
  var j = fromHex(stateString[1]);
  var s = stateString.split("").slice(2).map(fromHex);

  this.setState({
    i: i,
    j: j,
    s: s,
  });
};

RC4.RC4small = RC4small;

module.exports = RC4;


/***/ }),

/***/ 4281:
/***/ ((module) => {



function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var codes = {};

function createErrorType(code, message, Base) {
  if (!Base) {
    Base = Error;
  }

  function getMessage(arg1, arg2, arg3) {
    if (typeof message === 'string') {
      return message;
    } else {
      return message(arg1, arg2, arg3);
    }
  }

  var NodeError =
  /*#__PURE__*/
  function (_Base) {
    _inheritsLoose(NodeError, _Base);

    function NodeError(arg1, arg2, arg3) {
      return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
    }

    return NodeError;
  }(Base);

  NodeError.prototype.name = Base.name;
  NodeError.prototype.code = code;
  codes[code] = NodeError;
} // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


function oneOf(expected, thing) {
  if (Array.isArray(expected)) {
    var len = expected.length;
    expected = expected.map(function (i) {
      return String(i);
    });

    if (len > 2) {
      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
    } else if (len === 2) {
      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
    } else {
      return "of ".concat(thing, " ").concat(expected[0]);
    }
  } else {
    return "of ".concat(thing, " ").concat(String(expected));
  }
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


function startsWith(str, search, pos) {
  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


function endsWith(str, search, this_len) {
  if (this_len === undefined || this_len > str.length) {
    this_len = str.length;
  }

  return str.substring(this_len - search.length, this_len) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


function includes(str, search, start) {
  if (typeof start !== 'number') {
    start = 0;
  }

  if (start + search.length > str.length) {
    return false;
  } else {
    return str.indexOf(search, start) !== -1;
  }
}

createErrorType('ERR_INVALID_OPT_VALUE', function (name, value) {
  return 'The value "' + value + '" is invalid for option "' + name + '"';
}, TypeError);
createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
  // determiner: 'must be' or 'must not be'
  var determiner;

  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
    determiner = 'must not be';
    expected = expected.replace(/^not /, '');
  } else {
    determiner = 'must be';
  }

  var msg;

  if (endsWith(name, ' argument')) {
    // For cases like 'first argument'
    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  } else {
    var type = includes(name, '.') ? 'property' : 'argument';
    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  }

  msg += ". Received type ".concat(typeof actual);
  return msg;
}, TypeError);
createErrorType('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF');
createErrorType('ERR_METHOD_NOT_IMPLEMENTED', function (name) {
  return 'The ' + name + ' method is not implemented';
});
createErrorType('ERR_STREAM_PREMATURE_CLOSE', 'Premature close');
createErrorType('ERR_STREAM_DESTROYED', function (name) {
  return 'Cannot call ' + name + ' after a stream was destroyed';
});
createErrorType('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
createErrorType('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable');
createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
createErrorType('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError);
createErrorType('ERR_UNKNOWN_ENCODING', function (arg) {
  return 'Unknown encoding: ' + arg;
}, TypeError);
createErrorType('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event');
module.exports.q = codes;


/***/ }),

/***/ 6753:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.



/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
};
/*</replacement>*/

module.exports = Duplex;
var Readable = __webpack_require__(9481);
var Writable = __webpack_require__(4229);
__webpack_require__(5717)(Duplex, Readable);
{
  // Allow the keys array to be GC'ed.
  var keys = objectKeys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}
function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);
  Readable.call(this, options);
  Writable.call(this, options);
  this.allowHalfOpen = true;
  if (options) {
    if (options.readable === false) this.readable = false;
    if (options.writable === false) this.writable = false;
    if (options.allowHalfOpen === false) {
      this.allowHalfOpen = false;
      this.once('end', onend);
    }
  }
}
Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});
Object.defineProperty(Duplex.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
Object.defineProperty(Duplex.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});

// the no-half-open enforcer
function onend() {
  // If the writable side ended, then we're ok.
  if (this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(onEndNT, this);
}
function onEndNT(self) {
  self.end();
}
Object.defineProperty(Duplex.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

/***/ }),

/***/ 2725:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.



module.exports = PassThrough;
var Transform = __webpack_require__(4605);
__webpack_require__(5717)(PassThrough, Transform);
function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);
  Transform.call(this, options);
}
PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};

/***/ }),

/***/ 9481:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



module.exports = Readable;

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = (__webpack_require__(7187).EventEmitter);
var EElistenerCount = function EElistenerCount(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = __webpack_require__(2503);
/*</replacement>*/

var Buffer = (__webpack_require__(8764).Buffer);
var OurUint8Array = (typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*<replacement>*/
var debugUtil = __webpack_require__(4616);
var debug;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function debug() {};
}
/*</replacement>*/

var BufferList = __webpack_require__(7327);
var destroyImpl = __webpack_require__(1195);
var _require = __webpack_require__(2457),
  getHighWaterMark = _require.getHighWaterMark;
var _require$codes = (__webpack_require__(4281)/* .codes */ .q),
  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
  ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT;

// Lazy loaded to improve the startup performance.
var StringDecoder;
var createReadableStreamAsyncIterator;
var from;
__webpack_require__(5717)(Readable, Stream);
var errorOrDestroy = destroyImpl.errorOrDestroy;
var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];
function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}
function ReadableState(options, stream, isDuplex) {
  Duplex = Duplex || __webpack_require__(6753);
  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  this.highWaterMark = getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;
  this.paused = true;

  // Should close be emitted on destroy. Defaults to true.
  this.emitClose = options.emitClose !== false;

  // Should .destroy() be called after 'end' (and potentially 'finish')
  this.autoDestroy = !!options.autoDestroy;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;
  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = (__webpack_require__(2553)/* .StringDecoder */ .s);
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}
function Readable(options) {
  Duplex = Duplex || __webpack_require__(6753);
  if (!(this instanceof Readable)) return new Readable(options);

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the ReadableState constructor, at least with V8 6.5
  var isDuplex = this instanceof Duplex;
  this._readableState = new ReadableState(options, this, isDuplex);

  // legacy
  this.readable = true;
  if (options) {
    if (typeof options.read === 'function') this._read = options.read;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }
  Stream.call(this);
}
Object.defineProperty(Readable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});
Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;
  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }
  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};
function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  debug('readableAddChunk', chunk);
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      errorOrDestroy(stream, er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }
      if (addToFront) {
        if (state.endEmitted) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      } else if (state.destroyed) {
        return false;
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
      maybeReadMore(stream, state);
    }
  }

  // We can push more data if we are below the highWaterMark.
  // Also, if we have no data yet, we can stand some more bytes.
  // This is to work around cases where hwm=0, such as the repl.
  return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}
function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    state.awaitDrain = 0;
    stream.emit('data', chunk);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);
    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}
function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk);
  }
  return er;
}
Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = (__webpack_require__(2553)/* .StringDecoder */ .s);
  var decoder = new StringDecoder(enc);
  this._readableState.decoder = decoder;
  // If setEncoding(null), decoder.encoding equals utf8
  this._readableState.encoding = this._readableState.decoder.encoding;

  // Iterate over current buffer to convert already stored Buffers:
  var p = this._readableState.buffer.head;
  var content = '';
  while (p !== null) {
    content += decoder.write(p.data);
    p = p.next;
  }
  this._readableState.buffer.clear();
  if (content !== '') this._readableState.buffer.push(content);
  this._readableState.length = content.length;
  return this;
};

// Don't raise the hwm > 1GB
var MAX_HWM = 0x40000000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;
  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }
  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }
  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;
  if (ret === null) {
    state.needReadable = state.length <= state.highWaterMark;
    n = 0;
  } else {
    state.length -= n;
    state.awaitDrain = 0;
  }
  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }
  if (ret !== null) this.emit('data', ret);
  return ret;
};
function onEofChunk(stream, state) {
  debug('onEofChunk');
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;
  if (state.sync) {
    // if we are sync, wait until next tick to emit the data.
    // Otherwise we risk emitting data in the flow()
    // the readable code triggers during a read() call
    emitReadable(stream);
  } else {
    // emit 'readable' now to make sure it gets picked up.
    state.needReadable = false;
    if (!state.emittedReadable) {
      state.emittedReadable = true;
      emitReadable_(stream);
    }
  }
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  debug('emitReadable', state.needReadable, state.emittedReadable);
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    process.nextTick(emitReadable_, stream);
  }
}
function emitReadable_(stream) {
  var state = stream._readableState;
  debug('emitReadable_', state.destroyed, state.length, state.ended);
  if (!state.destroyed && (state.length || state.ended)) {
    stream.emit('readable');
    state.emittedReadable = false;
  }

  // The stream needs another readable event if
  // 1. It is not flowing, as the flow mechanism will take
  //    care of it.
  // 2. It is not ended.
  // 3. It is below the highWaterMark, so we can schedule
  //    another readable later.
  state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(maybeReadMore_, stream, state);
  }
}
function maybeReadMore_(stream, state) {
  // Attempt to read more data if we should.
  //
  // The conditions for reading more data are (one of):
  // - Not enough data buffered (state.length < state.highWaterMark). The loop
  //   is responsible for filling the buffer with enough data if such data
  //   is available. If highWaterMark is 0 and we are not in the flowing mode
  //   we should _not_ attempt to buffer any extra data. We'll get more data
  //   when the stream consumer calls read() instead.
  // - No data in the buffer, and the stream is in flowing mode. In this mode
  //   the loop below is responsible for ensuring read() is called. Failing to
  //   call read here would abort the flow and there's no other mechanism for
  //   continuing the flow if the stream consumer has just subscribed to the
  //   'data' event.
  //
  // In addition to the above conditions to keep reading data, the following
  // conditions prevent the data from being read:
  // - The stream has ended (state.ended).
  // - There is already a pending 'read' operation (state.reading). This is a
  //   case where the the stream has called the implementation defined _read()
  //   method, but they are processing the call asynchronously and have _not_
  //   called push() with new data. In this case we skip performing more
  //   read()s. The execution ends in this method again after the _read() ends
  //   up calling push() with more data.
  while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
    var len = state.length;
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED('_read()'));
};
Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;
  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) process.nextTick(endFn);else src.once('end', endFn);
  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }
  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);
  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);
    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    debug('dest.write', ret);
    if (ret === false) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', state.awaitDrain);
        state.awaitDrain++;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) errorOrDestroy(dest, er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);
  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }
  return dest;
};
function pipeOnDrain(src) {
  return function pipeOnDrainFunctionResult() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}
Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = {
    hasUnpiped: false
  };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;
    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    for (var i = 0; i < len; i++) dests[i].emit('unpipe', this, {
      hasUnpiped: false
    });
    return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;
  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];
  dest.emit('unpipe', this, unpipeInfo);
  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);
  var state = this._readableState;
  if (ev === 'data') {
    // update readableListening so that resume() may be a no-op
    // a few lines down. This is needed to support once('readable').
    state.readableListening = this.listenerCount('readable') > 0;

    // Try start flowing on next tick if stream isn't explicitly paused
    if (state.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.flowing = false;
      state.emittedReadable = false;
      debug('on readable', state.length, state.reading);
      if (state.length) {
        emitReadable(this);
      } else if (!state.reading) {
        process.nextTick(nReadingNextTick, this);
      }
    }
  }
  return res;
};
Readable.prototype.addListener = Readable.prototype.on;
Readable.prototype.removeListener = function (ev, fn) {
  var res = Stream.prototype.removeListener.call(this, ev, fn);
  if (ev === 'readable') {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }
  return res;
};
Readable.prototype.removeAllListeners = function (ev) {
  var res = Stream.prototype.removeAllListeners.apply(this, arguments);
  if (ev === 'readable' || ev === undefined) {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }
  return res;
};
function updateReadableListening(self) {
  var state = self._readableState;
  state.readableListening = self.listenerCount('readable') > 0;
  if (state.resumeScheduled && !state.paused) {
    // flowing needs to be set to true now, otherwise
    // the upcoming resume will not flow.
    state.flowing = true;

    // crude way to check if we should resume
  } else if (self.listenerCount('data') > 0) {
    self.resume();
  }
}
function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    // we flow only if there is no one listening
    // for readable, but we still have to call
    // resume()
    state.flowing = !state.readableListening;
    resume(this, state);
  }
  state.paused = false;
  return this;
};
function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(resume_, stream, state);
  }
}
function resume_(stream, state) {
  debug('resume', state.reading);
  if (!state.reading) {
    stream.read(0);
  }
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}
Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (this._readableState.flowing !== false) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  this._readableState.paused = true;
  return this;
};
function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null);
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;
  var state = this._readableState;
  var paused = false;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }
    _this.push(null);
  });
  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;
    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function methodWrap(method) {
        return function methodWrapReturnFunction() {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };
  return this;
};
if (typeof Symbol === 'function') {
  Readable.prototype[Symbol.asyncIterator] = function () {
    if (createReadableStreamAsyncIterator === undefined) {
      createReadableStreamAsyncIterator = __webpack_require__(5850);
    }
    return createReadableStreamAsyncIterator(this);
  };
}
Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.highWaterMark;
  }
});
Object.defineProperty(Readable.prototype, 'readableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState && this._readableState.buffer;
  }
});
Object.defineProperty(Readable.prototype, 'readableFlowing', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.flowing;
  },
  set: function set(state) {
    if (this._readableState) {
      this._readableState.flowing = state;
    }
  }
});

// exposed for testing purposes only.
Readable._fromList = fromList;
Object.defineProperty(Readable.prototype, 'readableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.length;
  }
});

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;
  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.first();else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = state.buffer.consume(n, state.decoder);
  }
  return ret;
}
function endReadable(stream) {
  var state = stream._readableState;
  debug('endReadable', state.endEmitted);
  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(endReadableNT, state, stream);
  }
}
function endReadableNT(state, stream) {
  debug('endReadableNT', state.endEmitted, state.length);

  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
    if (state.autoDestroy) {
      // In case of duplex streams we need a way to detect
      // if the writable side is ready for autoDestroy as well
      var wState = stream._writableState;
      if (!wState || wState.autoDestroy && wState.finished) {
        stream.destroy();
      }
    }
  }
}
if (typeof Symbol === 'function') {
  Readable.from = function (iterable, opts) {
    if (from === undefined) {
      from = __webpack_require__(5167);
    }
    return from(Readable, iterable, opts);
  };
}
function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

/***/ }),

/***/ 4605:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.



module.exports = Transform;
var _require$codes = (__webpack_require__(4281)/* .codes */ .q),
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
  ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING,
  ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;
var Duplex = __webpack_require__(6753);
__webpack_require__(5717)(Transform, Duplex);
function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;
  var cb = ts.writecb;
  if (cb === null) {
    return this.emit('error', new ERR_MULTIPLE_CALLBACK());
  }
  ts.writechunk = null;
  ts.writecb = null;
  if (data != null)
    // single equals check for both `null` and `undefined`
    this.push(data);
  cb(er);
  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}
function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);
  Duplex.call(this, options);
  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;
  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;
    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}
function prefinish() {
  var _this = this;
  if (typeof this._flush === 'function' && !this._readableState.destroyed) {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}
Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_transform()'));
};
Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;
  if (ts.writechunk !== null && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};
Transform.prototype._destroy = function (err, cb) {
  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
  });
};
function done(stream, er, data) {
  if (er) return stream.emit('error', er);
  if (data != null)
    // single equals check for both `null` and `undefined`
    stream.push(data);

  // TODO(BridgeAR): Write a test for these two error cases
  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
  if (stream._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
  return stream.push(null);
}

/***/ }),

/***/ 4229:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.



module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;
  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var internalUtil = {
  deprecate: __webpack_require__(4927)
};
/*</replacement>*/

/*<replacement>*/
var Stream = __webpack_require__(2503);
/*</replacement>*/

var Buffer = (__webpack_require__(8764).Buffer);
var OurUint8Array = (typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
var destroyImpl = __webpack_require__(1195);
var _require = __webpack_require__(2457),
  getHighWaterMark = _require.getHighWaterMark;
var _require$codes = (__webpack_require__(4281)/* .codes */ .q),
  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
  ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE,
  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED,
  ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES,
  ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END,
  ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;
var errorOrDestroy = destroyImpl.errorOrDestroy;
__webpack_require__(5717)(Writable, Stream);
function nop() {}
function WritableState(options, stream, isDuplex) {
  Duplex = Duplex || __webpack_require__(6753);
  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream,
  // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  this.highWaterMark = getHighWaterMark(this, options, 'writableHighWaterMark', isDuplex);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;
  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // Should close be emitted on destroy. Defaults to true.
  this.emitClose = options.emitClose !== false;

  // Should .destroy() be called after 'finish' (and potentially 'end')
  this.autoDestroy = !!options.autoDestroy;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}
WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};
(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function writableStateBufferGetter() {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function value(object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;
      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function realHasInstance(object) {
    return object instanceof this;
  };
}
function Writable(options) {
  Duplex = Duplex || __webpack_require__(6753);

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the WritableState constructor, at least with V8 6.5
  var isDuplex = this instanceof Duplex;
  if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
  this._writableState = new WritableState(options, this, isDuplex);

  // legacy.
  this.writable = true;
  if (options) {
    if (typeof options.write === 'function') this._write = options.write;
    if (typeof options.writev === 'function') this._writev = options.writev;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
    if (typeof options.final === 'function') this._final = options.final;
  }
  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
};
function writeAfterEnd(stream, cb) {
  var er = new ERR_STREAM_WRITE_AFTER_END();
  // TODO: defer error events consistently everywhere, not just the cb
  errorOrDestroy(stream, er);
  process.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var er;
  if (chunk === null) {
    er = new ERR_STREAM_NULL_VALUES();
  } else if (typeof chunk !== 'string' && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer'], chunk);
  }
  if (er) {
    errorOrDestroy(stream, er);
    process.nextTick(cb, er);
    return false;
  }
  return true;
}
Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);
  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }
  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }
  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;
  if (typeof cb !== 'function') cb = nop;
  if (state.ending) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }
  return ret;
};
Writable.prototype.cork = function () {
  this._writableState.corked++;
};
Writable.prototype.uncork = function () {
  var state = this._writableState;
  if (state.corked) {
    state.corked--;
    if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};
Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};
Object.defineProperty(Writable.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}
Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;
  state.length += len;
  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;
  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }
  return ret;
}
function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED('write'));else if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}
function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    process.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    process.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}
function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}
function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;
  if (typeof cb !== 'function') throw new ERR_MULTIPLE_CALLBACK();
  onwriteStateUpdate(state);
  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state) || stream.destroyed;
    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }
    if (sync) {
      process.nextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}
function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;
  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;
    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;
    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;
      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }
    if (entry === null) state.lastBufferedRequest = null;
  }
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}
Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_write()'));
};
Writable.prototype._writev = null;
Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;
  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }
  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending) endWritable(this, state, cb);
  return this;
};
Object.defineProperty(Writable.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});
function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      errorOrDestroy(stream, err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function' && !state.destroyed) {
      state.pendingcb++;
      state.finalCalled = true;
      process.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}
function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
      if (state.autoDestroy) {
        // In case of duplex streams we need a way to detect
        // if the readable side is ready for autoDestroy as well
        var rState = stream._readableState;
        if (!rState || rState.autoDestroy && rState.endEmitted) {
          stream.destroy();
        }
      }
    }
  }
  return need;
}
function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) process.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}
function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }

  // reuse the free corkReq.
  state.corkedRequestsFree.next = corkReq;
}
Object.defineProperty(Writable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});
Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  cb(err);
};

/***/ }),

/***/ 5850:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);


var _Object$setPrototypeO;
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var finished = __webpack_require__(8610);
var kLastResolve = Symbol('lastResolve');
var kLastReject = Symbol('lastReject');
var kError = Symbol('error');
var kEnded = Symbol('ended');
var kLastPromise = Symbol('lastPromise');
var kHandlePromise = Symbol('handlePromise');
var kStream = Symbol('stream');
function createIterResult(value, done) {
  return {
    value: value,
    done: done
  };
}
function readAndResolve(iter) {
  var resolve = iter[kLastResolve];
  if (resolve !== null) {
    var data = iter[kStream].read();
    // we defer if data is null
    // we can be expecting either 'end' or
    // 'error'
    if (data !== null) {
      iter[kLastPromise] = null;
      iter[kLastResolve] = null;
      iter[kLastReject] = null;
      resolve(createIterResult(data, false));
    }
  }
}
function onReadable(iter) {
  // we wait for the next tick, because it might
  // emit an error with process.nextTick
  process.nextTick(readAndResolve, iter);
}
function wrapForNext(lastPromise, iter) {
  return function (resolve, reject) {
    lastPromise.then(function () {
      if (iter[kEnded]) {
        resolve(createIterResult(undefined, true));
        return;
      }
      iter[kHandlePromise](resolve, reject);
    }, reject);
  };
}
var AsyncIteratorPrototype = Object.getPrototypeOf(function () {});
var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
  get stream() {
    return this[kStream];
  },
  next: function next() {
    var _this = this;
    // if we have detected an error in the meanwhile
    // reject straight away
    var error = this[kError];
    if (error !== null) {
      return Promise.reject(error);
    }
    if (this[kEnded]) {
      return Promise.resolve(createIterResult(undefined, true));
    }
    if (this[kStream].destroyed) {
      // We need to defer via nextTick because if .destroy(err) is
      // called, the error will be emitted via nextTick, and
      // we cannot guarantee that there is no error lingering around
      // waiting to be emitted.
      return new Promise(function (resolve, reject) {
        process.nextTick(function () {
          if (_this[kError]) {
            reject(_this[kError]);
          } else {
            resolve(createIterResult(undefined, true));
          }
        });
      });
    }

    // if we have multiple next() calls
    // we will wait for the previous Promise to finish
    // this logic is optimized to support for await loops,
    // where next() is only called once at a time
    var lastPromise = this[kLastPromise];
    var promise;
    if (lastPromise) {
      promise = new Promise(wrapForNext(lastPromise, this));
    } else {
      // fast path needed to support multiple this.push()
      // without triggering the next() queue
      var data = this[kStream].read();
      if (data !== null) {
        return Promise.resolve(createIterResult(data, false));
      }
      promise = new Promise(this[kHandlePromise]);
    }
    this[kLastPromise] = promise;
    return promise;
  }
}, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function () {
  return this;
}), _defineProperty(_Object$setPrototypeO, "return", function _return() {
  var _this2 = this;
  // destroy(err, cb) is a private API
  // we can guarantee we have that here, because we control the
  // Readable class this is attached to
  return new Promise(function (resolve, reject) {
    _this2[kStream].destroy(null, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(createIterResult(undefined, true));
    });
  });
}), _Object$setPrototypeO), AsyncIteratorPrototype);
var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator(stream) {
  var _Object$create;
  var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
    value: stream,
    writable: true
  }), _defineProperty(_Object$create, kLastResolve, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kLastReject, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kError, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kEnded, {
    value: stream._readableState.endEmitted,
    writable: true
  }), _defineProperty(_Object$create, kHandlePromise, {
    value: function value(resolve, reject) {
      var data = iterator[kStream].read();
      if (data) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        resolve(createIterResult(data, false));
      } else {
        iterator[kLastResolve] = resolve;
        iterator[kLastReject] = reject;
      }
    },
    writable: true
  }), _Object$create));
  iterator[kLastPromise] = null;
  finished(stream, function (err) {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      var reject = iterator[kLastReject];
      // reject if we are waiting for data in the Promise
      // returned by next() and store the error
      if (reject !== null) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        reject(err);
      }
      iterator[kError] = err;
      return;
    }
    var resolve = iterator[kLastResolve];
    if (resolve !== null) {
      iterator[kLastPromise] = null;
      iterator[kLastResolve] = null;
      iterator[kLastReject] = null;
      resolve(createIterResult(undefined, true));
    }
    iterator[kEnded] = true;
  });
  stream.on('readable', onReadable.bind(null, iterator));
  return iterator;
};
module.exports = createReadableStreamAsyncIterator;

/***/ }),

/***/ 7327:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var _require = __webpack_require__(8764),
  Buffer = _require.Buffer;
var _require2 = __webpack_require__(2361),
  inspect = _require2.inspect;
var custom = inspect && inspect.custom || 'inspect';
function copyBuffer(src, target, offset) {
  Buffer.prototype.copy.call(src, target, offset);
}
module.exports = /*#__PURE__*/function () {
  function BufferList() {
    _classCallCheck(this, BufferList);
    this.head = null;
    this.tail = null;
    this.length = 0;
  }
  _createClass(BufferList, [{
    key: "push",
    value: function push(v) {
      var entry = {
        data: v,
        next: null
      };
      if (this.length > 0) this.tail.next = entry;else this.head = entry;
      this.tail = entry;
      ++this.length;
    }
  }, {
    key: "unshift",
    value: function unshift(v) {
      var entry = {
        data: v,
        next: this.head
      };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    }
  }, {
    key: "shift",
    value: function shift() {
      if (this.length === 0) return;
      var ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
      --this.length;
      return ret;
    }
  }, {
    key: "clear",
    value: function clear() {
      this.head = this.tail = null;
      this.length = 0;
    }
  }, {
    key: "join",
    value: function join(s) {
      if (this.length === 0) return '';
      var p = this.head;
      var ret = '' + p.data;
      while (p = p.next) ret += s + p.data;
      return ret;
    }
  }, {
    key: "concat",
    value: function concat(n) {
      if (this.length === 0) return Buffer.alloc(0);
      var ret = Buffer.allocUnsafe(n >>> 0);
      var p = this.head;
      var i = 0;
      while (p) {
        copyBuffer(p.data, ret, i);
        i += p.data.length;
        p = p.next;
      }
      return ret;
    }

    // Consumes a specified amount of bytes or characters from the buffered data.
  }, {
    key: "consume",
    value: function consume(n, hasStrings) {
      var ret;
      if (n < this.head.data.length) {
        // `slice` is the same for buffers and strings.
        ret = this.head.data.slice(0, n);
        this.head.data = this.head.data.slice(n);
      } else if (n === this.head.data.length) {
        // First chunk is a perfect match.
        ret = this.shift();
      } else {
        // Result spans more than one buffer.
        ret = hasStrings ? this._getString(n) : this._getBuffer(n);
      }
      return ret;
    }
  }, {
    key: "first",
    value: function first() {
      return this.head.data;
    }

    // Consumes a specified amount of characters from the buffered data.
  }, {
    key: "_getString",
    value: function _getString(n) {
      var p = this.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;
      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length) ret += str;else ret += str.slice(0, n);
        n -= nb;
        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = str.slice(nb);
          }
          break;
        }
        ++c;
      }
      this.length -= c;
      return ret;
    }

    // Consumes a specified amount of bytes from the buffered data.
  }, {
    key: "_getBuffer",
    value: function _getBuffer(n) {
      var ret = Buffer.allocUnsafe(n);
      var p = this.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;
      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;
        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = buf.slice(nb);
          }
          break;
        }
        ++c;
      }
      this.length -= c;
      return ret;
    }

    // Make sure the linked list only shows the minimal necessary information.
  }, {
    key: custom,
    value: function value(_, options) {
      return inspect(this, _objectSpread(_objectSpread({}, options), {}, {
        // Only inspect one level.
        depth: 0,
        // It should not recurse.
        customInspect: false
      }));
    }
  }]);
  return BufferList;
}();

/***/ }),

/***/ 1195:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(8768);


// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;
  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;
  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err) {
      if (!this._writableState) {
        process.nextTick(emitErrorNT, this, err);
      } else if (!this._writableState.errorEmitted) {
        this._writableState.errorEmitted = true;
        process.nextTick(emitErrorNT, this, err);
      }
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }
  this._destroy(err || null, function (err) {
    if (!cb && err) {
      if (!_this._writableState) {
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else if (!_this._writableState.errorEmitted) {
        _this._writableState.errorEmitted = true;
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else {
        process.nextTick(emitCloseNT, _this);
      }
    } else if (cb) {
      process.nextTick(emitCloseNT, _this);
      cb(err);
    } else {
      process.nextTick(emitCloseNT, _this);
    }
  });
  return this;
}
function emitErrorAndCloseNT(self, err) {
  emitErrorNT(self, err);
  emitCloseNT(self);
}
function emitCloseNT(self) {
  if (self._writableState && !self._writableState.emitClose) return;
  if (self._readableState && !self._readableState.emitClose) return;
  self.emit('close');
}
function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }
  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finalCalled = false;
    this._writableState.prefinished = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}
function emitErrorNT(self, err) {
  self.emit('error', err);
}
function errorOrDestroy(stream, err) {
  // We have tests that rely on errors being emitted
  // in the same tick, so changing this is semver major.
  // For now when you opt-in to autoDestroy we allow
  // the error to be emitted nextTick. In a future
  // semver major update we should change the default to this.

  var rState = stream._readableState;
  var wState = stream._writableState;
  if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream.destroy(err);else stream.emit('error', err);
}
module.exports = {
  destroy: destroy,
  undestroy: undestroy,
  errorOrDestroy: errorOrDestroy
};

/***/ }),

/***/ 8610:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Ported from https://github.com/mafintosh/end-of-stream with
// permission from the author, Mathias Buus (@mafintosh).



var ERR_STREAM_PREMATURE_CLOSE = (__webpack_require__(4281)/* .codes.ERR_STREAM_PREMATURE_CLOSE */ .q.ERR_STREAM_PREMATURE_CLOSE);
function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    callback.apply(this, args);
  };
}
function noop() {}
function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}
function eos(stream, opts, callback) {
  if (typeof opts === 'function') return eos(stream, null, opts);
  if (!opts) opts = {};
  callback = once(callback || noop);
  var readable = opts.readable || opts.readable !== false && stream.readable;
  var writable = opts.writable || opts.writable !== false && stream.writable;
  var onlegacyfinish = function onlegacyfinish() {
    if (!stream.writable) onfinish();
  };
  var writableEnded = stream._writableState && stream._writableState.finished;
  var onfinish = function onfinish() {
    writable = false;
    writableEnded = true;
    if (!readable) callback.call(stream);
  };
  var readableEnded = stream._readableState && stream._readableState.endEmitted;
  var onend = function onend() {
    readable = false;
    readableEnded = true;
    if (!writable) callback.call(stream);
  };
  var onerror = function onerror(err) {
    callback.call(stream, err);
  };
  var onclose = function onclose() {
    var err;
    if (readable && !readableEnded) {
      if (!stream._readableState || !stream._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
    if (writable && !writableEnded) {
      if (!stream._writableState || !stream._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
  };
  var onrequest = function onrequest() {
    stream.req.on('finish', onfinish);
  };
  if (isRequest(stream)) {
    stream.on('complete', onfinish);
    stream.on('abort', onclose);
    if (stream.req) onrequest();else stream.on('request', onrequest);
  } else if (writable && !stream._writableState) {
    // legacy streams
    stream.on('end', onlegacyfinish);
    stream.on('close', onlegacyfinish);
  }
  stream.on('end', onend);
  stream.on('finish', onfinish);
  if (opts.error !== false) stream.on('error', onerror);
  stream.on('close', onclose);
  return function () {
    stream.removeListener('complete', onfinish);
    stream.removeListener('abort', onclose);
    stream.removeListener('request', onrequest);
    if (stream.req) stream.req.removeListener('finish', onfinish);
    stream.removeListener('end', onlegacyfinish);
    stream.removeListener('close', onlegacyfinish);
    stream.removeListener('finish', onfinish);
    stream.removeListener('end', onend);
    stream.removeListener('error', onerror);
    stream.removeListener('close', onclose);
  };
}
module.exports = eos;

/***/ }),

/***/ 5167:
/***/ ((module) => {

module.exports = function () {
  throw new Error('Readable.from is not available in the browser')
};


/***/ }),

/***/ 9946:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Ported from https://github.com/mafintosh/pump with
// permission from the author, Mathias Buus (@mafintosh).



var eos;
function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    callback.apply(void 0, arguments);
  };
}
var _require$codes = (__webpack_require__(4281)/* .codes */ .q),
  ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;
function noop(err) {
  // Rethrow the error if it exists to avoid swallowing it
  if (err) throw err;
}
function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}
function destroyer(stream, reading, writing, callback) {
  callback = once(callback);
  var closed = false;
  stream.on('close', function () {
    closed = true;
  });
  if (eos === undefined) eos = __webpack_require__(8610);
  eos(stream, {
    readable: reading,
    writable: writing
  }, function (err) {
    if (err) return callback(err);
    closed = true;
    callback();
  });
  var destroyed = false;
  return function (err) {
    if (closed) return;
    if (destroyed) return;
    destroyed = true;

    // request.destroy just do .end - .abort is what we want
    if (isRequest(stream)) return stream.abort();
    if (typeof stream.destroy === 'function') return stream.destroy();
    callback(err || new ERR_STREAM_DESTROYED('pipe'));
  };
}
function call(fn) {
  fn();
}
function pipe(from, to) {
  return from.pipe(to);
}
function popCallback(streams) {
  if (!streams.length) return noop;
  if (typeof streams[streams.length - 1] !== 'function') return noop;
  return streams.pop();
}
function pipeline() {
  for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
    streams[_key] = arguments[_key];
  }
  var callback = popCallback(streams);
  if (Array.isArray(streams[0])) streams = streams[0];
  if (streams.length < 2) {
    throw new ERR_MISSING_ARGS('streams');
  }
  var error;
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1;
    var writing = i > 0;
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err;
      if (err) destroys.forEach(call);
      if (reading) return;
      destroys.forEach(call);
      callback(error);
    });
  });
  return streams.reduce(pipe);
}
module.exports = pipeline;

/***/ }),

/***/ 2457:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var ERR_INVALID_OPT_VALUE = (__webpack_require__(4281)/* .codes.ERR_INVALID_OPT_VALUE */ .q.ERR_INVALID_OPT_VALUE);
function highWaterMarkFrom(options, isDuplex, duplexKey) {
  return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
}
function getHighWaterMark(state, options, duplexKey, isDuplex) {
  var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
  if (hwm != null) {
    if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
      var name = isDuplex ? duplexKey : 'highWaterMark';
      throw new ERR_INVALID_OPT_VALUE(name, hwm);
    }
    return Math.floor(hwm);
  }

  // Default value
  return state.objectMode ? 16 : 16 * 1024;
}
module.exports = {
  getHighWaterMark: getHighWaterMark
};

/***/ }),

/***/ 2503:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(7187).EventEmitter;


/***/ }),

/***/ 8473:
/***/ ((module, exports, __webpack_require__) => {

exports = module.exports = __webpack_require__(9481);
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = __webpack_require__(4229);
exports.Duplex = __webpack_require__(6753);
exports.Transform = __webpack_require__(4605);
exports.PassThrough = __webpack_require__(2725);
exports.finished = __webpack_require__(8610);
exports.pipeline = __webpack_require__(9946);


/***/ }),

/***/ 9967:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*! run-parallel-limit. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
module.exports = runParallelLimit

const queueMicrotask = __webpack_require__(4375)

function runParallelLimit (tasks, limit, cb) {
  if (typeof limit !== 'number') throw new Error('second argument must be a Number')
  let results, len, pending, keys, isErrored
  let isSync = true
  let next

  if (Array.isArray(tasks)) {
    results = []
    pending = len = tasks.length
  } else {
    keys = Object.keys(tasks)
    results = {}
    pending = len = keys.length
  }

  function done (err) {
    function end () {
      if (cb) cb(err, results)
      cb = null
    }
    if (isSync) queueMicrotask(end)
    else end()
  }

  function each (i, err, result) {
    results[i] = result
    if (err) isErrored = true
    if (--pending === 0 || err) {
      done(err)
    } else if (!isErrored && next < len) {
      let key
      if (keys) {
        key = keys[next]
        next += 1
        tasks[key](function (err, result) { each(key, err, result) })
      } else {
        key = next
        next += 1
        tasks[key](function (err, result) { each(key, err, result) })
      }
    }
  }

  next = limit
  if (!pending) {
    // empty
    done(null)
  } else if (keys) {
    // object
    keys.some(function (key, i) {
      tasks[key](function (err, result) { each(key, err, result) })
      if (i === limit - 1) return true // early return
      return false
    })
  } else {
    // array
    tasks.some(function (task, i) {
      task(function (err, result) { each(i, err, result) })
      if (i === limit - 1) return true // early return
      return false
    })
  }

  isSync = false
}


/***/ }),

/***/ 4595:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*! run-parallel. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
module.exports = runParallel

const queueMicrotask = __webpack_require__(4375)

function runParallel (tasks, cb) {
  let results, pending, keys
  let isSync = true

  if (Array.isArray(tasks)) {
    results = []
    pending = tasks.length
  } else {
    keys = Object.keys(tasks)
    results = {}
    pending = keys.length
  }

  function done (err) {
    function end () {
      if (cb) cb(err, results)
      cb = null
    }
    if (isSync) queueMicrotask(end)
    else end()
  }

  function each (i, err, result) {
    results[i] = result
    if (--pending === 0 || err) {
      done(err)
    }
  }

  if (!pending) {
    // empty
    done(null)
  } else if (keys) {
    // object
    keys.forEach(function (key) {
      tasks[key](function (err, result) { each(key, err, result) })
    })
  } else {
    // array
    tasks.forEach(function (task, i) {
      task(function (err, result) { each(i, err, result) })
    })
  }

  isSync = false
}


/***/ }),

/***/ 9509:
/***/ ((module, exports, __webpack_require__) => {

/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
/* eslint-disable node/no-deprecated-api */
var buffer = __webpack_require__(8764)
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}


/***/ }),

/***/ 7485:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(8764)["Buffer"];
/*! simple-concat. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
module.exports = function (stream, cb) {
  var chunks = []
  stream.on('data', function (chunk) {
    chunks.push(chunk)
  })
  stream.once('end', function () {
    if (cb) cb(null, Buffer.concat(chunks))
    cb = null
  })
  stream.once('error', function (err) {
    if (cb) cb(err)
    cb = null
  })
}


/***/ }),

/***/ 8853:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*! simple-peer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
const debug = __webpack_require__(1227)('simple-peer')
const getBrowserRTC = __webpack_require__(5177)
const randombytes = __webpack_require__(1798)
const stream = __webpack_require__(8473)
const queueMicrotask = __webpack_require__(4375) // TODO: remove when Node 10 is not supported
const errCode = __webpack_require__(2114)
const { Buffer } = __webpack_require__(8764)

const MAX_BUFFERED_AMOUNT = 64 * 1024
const ICECOMPLETE_TIMEOUT = 5 * 1000
const CHANNEL_CLOSING_TIMEOUT = 5 * 1000

// HACK: Filter trickle lines when trickle is disabled #354
function filterTrickle (sdp) {
  return sdp.replace(/a=ice-options:trickle\s\n/g, '')
}

function warn (message) {
  console.warn(message)
}

/**
 * WebRTC peer connection. Same API as node core `net.Socket`, plus a few extra methods.
 * Duplex stream.
 * @param {Object} opts
 */
class Peer extends stream.Duplex {
  constructor (opts) {
    opts = Object.assign({
      allowHalfOpen: false
    }, opts)

    super(opts)

    this._id = randombytes(4).toString('hex').slice(0, 7)
    this._debug('new peer %o', opts)

    this.channelName = opts.initiator
      ? opts.channelName || randombytes(20).toString('hex')
      : null

    this.initiator = opts.initiator || false
    this.channelConfig = opts.channelConfig || Peer.channelConfig
    this.channelNegotiated = this.channelConfig.negotiated
    this.config = Object.assign({}, Peer.config, opts.config)
    this.offerOptions = opts.offerOptions || {}
    this.answerOptions = opts.answerOptions || {}
    this.sdpTransform = opts.sdpTransform || (sdp => sdp)
    this.streams = opts.streams || (opts.stream ? [opts.stream] : []) // support old "stream" option
    this.trickle = opts.trickle !== undefined ? opts.trickle : true
    this.allowHalfTrickle = opts.allowHalfTrickle !== undefined ? opts.allowHalfTrickle : false
    this.iceCompleteTimeout = opts.iceCompleteTimeout || ICECOMPLETE_TIMEOUT

    this.destroyed = false
    this.destroying = false
    this._connected = false

    this.remoteAddress = undefined
    this.remoteFamily = undefined
    this.remotePort = undefined
    this.localAddress = undefined
    this.localFamily = undefined
    this.localPort = undefined

    this._wrtc = (opts.wrtc && typeof opts.wrtc === 'object')
      ? opts.wrtc
      : getBrowserRTC()

    if (!this._wrtc) {
      if (typeof window === 'undefined') {
        throw errCode(new Error('No WebRTC support: Specify `opts.wrtc` option in this environment'), 'ERR_WEBRTC_SUPPORT')
      } else {
        throw errCode(new Error('No WebRTC support: Not a supported browser'), 'ERR_WEBRTC_SUPPORT')
      }
    }

    this._pcReady = false
    this._channelReady = false
    this._iceComplete = false // ice candidate trickle done (got null candidate)
    this._iceCompleteTimer = null // send an offer/answer anyway after some timeout
    this._channel = null
    this._pendingCandidates = []

    this._isNegotiating = false // is this peer waiting for negotiation to complete?
    this._firstNegotiation = true
    this._batchedNegotiation = false // batch synchronous negotiations
    this._queuedNegotiation = false // is there a queued negotiation request?
    this._sendersAwaitingStable = []
    this._senderMap = new Map()
    this._closingInterval = null

    this._remoteTracks = []
    this._remoteStreams = []

    this._chunk = null
    this._cb = null
    this._interval = null

    try {
      this._pc = new (this._wrtc.RTCPeerConnection)(this.config)
    } catch (err) {
      this.destroy(errCode(err, 'ERR_PC_CONSTRUCTOR'))
      return
    }

    // We prefer feature detection whenever possible, but sometimes that's not
    // possible for certain implementations.
    this._isReactNativeWebrtc = typeof this._pc._peerConnectionId === 'number'

    this._pc.oniceconnectionstatechange = () => {
      this._onIceStateChange()
    }
    this._pc.onicegatheringstatechange = () => {
      this._onIceStateChange()
    }
    this._pc.onconnectionstatechange = () => {
      this._onConnectionStateChange()
    }
    this._pc.onsignalingstatechange = () => {
      this._onSignalingStateChange()
    }
    this._pc.onicecandidate = event => {
      this._onIceCandidate(event)
    }

    // HACK: Fix for odd Firefox behavior, see: https://github.com/feross/simple-peer/pull/783
    if (typeof this._pc.peerIdentity === 'object') {
      this._pc.peerIdentity.catch(err => {
        this.destroy(errCode(err, 'ERR_PC_PEER_IDENTITY'))
      })
    }

    // Other spec events, unused by this implementation:
    // - onconnectionstatechange
    // - onicecandidateerror
    // - onfingerprintfailure
    // - onnegotiationneeded

    if (this.initiator || this.channelNegotiated) {
      this._setupData({
        channel: this._pc.createDataChannel(this.channelName, this.channelConfig)
      })
    } else {
      this._pc.ondatachannel = event => {
        this._setupData(event)
      }
    }

    if (this.streams) {
      this.streams.forEach(stream => {
        this.addStream(stream)
      })
    }
    this._pc.ontrack = event => {
      this._onTrack(event)
    }

    this._debug('initial negotiation')
    this._needsNegotiation()

    this._onFinishBound = () => {
      this._onFinish()
    }
    this.once('finish', this._onFinishBound)
  }

  get bufferSize () {
    return (this._channel && this._channel.bufferedAmount) || 0
  }

  // HACK: it's possible channel.readyState is "closing" before peer.destroy() fires
  // https://bugs.chromium.org/p/chromium/issues/detail?id=882743
  get connected () {
    return (this._connected && this._channel.readyState === 'open')
  }

  address () {
    return { port: this.localPort, family: this.localFamily, address: this.localAddress }
  }

  signal (data) {
    if (this.destroying) return
    if (this.destroyed) throw errCode(new Error('cannot signal after peer is destroyed'), 'ERR_DESTROYED')
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch (err) {
        data = {}
      }
    }
    this._debug('signal()')

    if (data.renegotiate && this.initiator) {
      this._debug('got request to renegotiate')
      this._needsNegotiation()
    }
    if (data.transceiverRequest && this.initiator) {
      this._debug('got request for transceiver')
      this.addTransceiver(data.transceiverRequest.kind, data.transceiverRequest.init)
    }
    if (data.candidate) {
      if (this._pc.remoteDescription && this._pc.remoteDescription.type) {
        this._addIceCandidate(data.candidate)
      } else {
        this._pendingCandidates.push(data.candidate)
      }
    }
    if (data.sdp) {
      this._pc.setRemoteDescription(new (this._wrtc.RTCSessionDescription)(data))
        .then(() => {
          if (this.destroyed) return

          this._pendingCandidates.forEach(candidate => {
            this._addIceCandidate(candidate)
          })
          this._pendingCandidates = []

          if (this._pc.remoteDescription.type === 'offer') this._createAnswer()
        })
        .catch(err => {
          this.destroy(errCode(err, 'ERR_SET_REMOTE_DESCRIPTION'))
        })
    }
    if (!data.sdp && !data.candidate && !data.renegotiate && !data.transceiverRequest) {
      this.destroy(errCode(new Error('signal() called with invalid signal data'), 'ERR_SIGNALING'))
    }
  }

  _addIceCandidate (candidate) {
    const iceCandidateObj = new this._wrtc.RTCIceCandidate(candidate)
    this._pc.addIceCandidate(iceCandidateObj)
      .catch(err => {
        if (!iceCandidateObj.address || iceCandidateObj.address.endsWith('.local')) {
          warn('Ignoring unsupported ICE candidate.')
        } else {
          this.destroy(errCode(err, 'ERR_ADD_ICE_CANDIDATE'))
        }
      })
  }

  /**
   * Send text/binary data to the remote peer.
   * @param {ArrayBufferView|ArrayBuffer|Buffer|string|Blob} chunk
   */
  send (chunk) {
    if (this.destroying) return
    if (this.destroyed) throw errCode(new Error('cannot send after peer is destroyed'), 'ERR_DESTROYED')
    this._channel.send(chunk)
  }

  /**
   * Add a Transceiver to the connection.
   * @param {String} kind
   * @param {Object} init
   */
  addTransceiver (kind, init) {
    if (this.destroying) return
    if (this.destroyed) throw errCode(new Error('cannot addTransceiver after peer is destroyed'), 'ERR_DESTROYED')
    this._debug('addTransceiver()')

    if (this.initiator) {
      try {
        this._pc.addTransceiver(kind, init)
        this._needsNegotiation()
      } catch (err) {
        this.destroy(errCode(err, 'ERR_ADD_TRANSCEIVER'))
      }
    } else {
      this.emit('signal', { // request initiator to renegotiate
        type: 'transceiverRequest',
        transceiverRequest: { kind, init }
      })
    }
  }

  /**
   * Add a MediaStream to the connection.
   * @param {MediaStream} stream
   */
  addStream (stream) {
    if (this.destroying) return
    if (this.destroyed) throw errCode(new Error('cannot addStream after peer is destroyed'), 'ERR_DESTROYED')
    this._debug('addStream()')

    stream.getTracks().forEach(track => {
      this.addTrack(track, stream)
    })
  }

  /**
   * Add a MediaStreamTrack to the connection.
   * @param {MediaStreamTrack} track
   * @param {MediaStream} stream
   */
  addTrack (track, stream) {
    if (this.destroying) return
    if (this.destroyed) throw errCode(new Error('cannot addTrack after peer is destroyed'), 'ERR_DESTROYED')
    this._debug('addTrack()')

    const submap = this._senderMap.get(track) || new Map() // nested Maps map [track, stream] to sender
    let sender = submap.get(stream)
    if (!sender) {
      sender = this._pc.addTrack(track, stream)
      submap.set(stream, sender)
      this._senderMap.set(track, submap)
      this._needsNegotiation()
    } else if (sender.removed) {
      throw errCode(new Error('Track has been removed. You should enable/disable tracks that you want to re-add.'), 'ERR_SENDER_REMOVED')
    } else {
      throw errCode(new Error('Track has already been added to that stream.'), 'ERR_SENDER_ALREADY_ADDED')
    }
  }

  /**
   * Replace a MediaStreamTrack by another in the connection.
   * @param {MediaStreamTrack} oldTrack
   * @param {MediaStreamTrack} newTrack
   * @param {MediaStream} stream
   */
  replaceTrack (oldTrack, newTrack, stream) {
    if (this.destroying) return
    if (this.destroyed) throw errCode(new Error('cannot replaceTrack after peer is destroyed'), 'ERR_DESTROYED')
    this._debug('replaceTrack()')

    const submap = this._senderMap.get(oldTrack)
    const sender = submap ? submap.get(stream) : null
    if (!sender) {
      throw errCode(new Error('Cannot replace track that was never added.'), 'ERR_TRACK_NOT_ADDED')
    }
    if (newTrack) this._senderMap.set(newTrack, submap)

    if (sender.replaceTrack != null) {
      sender.replaceTrack(newTrack)
    } else {
      this.destroy(errCode(new Error('replaceTrack is not supported in this browser'), 'ERR_UNSUPPORTED_REPLACETRACK'))
    }
  }

  /**
   * Remove a MediaStreamTrack from the connection.
   * @param {MediaStreamTrack} track
   * @param {MediaStream} stream
   */
  removeTrack (track, stream) {
    if (this.destroying) return
    if (this.destroyed) throw errCode(new Error('cannot removeTrack after peer is destroyed'), 'ERR_DESTROYED')
    this._debug('removeSender()')

    const submap = this._senderMap.get(track)
    const sender = submap ? submap.get(stream) : null
    if (!sender) {
      throw errCode(new Error('Cannot remove track that was never added.'), 'ERR_TRACK_NOT_ADDED')
    }
    try {
      sender.removed = true
      this._pc.removeTrack(sender)
    } catch (err) {
      if (err.name === 'NS_ERROR_UNEXPECTED') {
        this._sendersAwaitingStable.push(sender) // HACK: Firefox must wait until (signalingState === stable) https://bugzilla.mozilla.org/show_bug.cgi?id=1133874
      } else {
        this.destroy(errCode(err, 'ERR_REMOVE_TRACK'))
      }
    }
    this._needsNegotiation()
  }

  /**
   * Remove a MediaStream from the connection.
   * @param {MediaStream} stream
   */
  removeStream (stream) {
    if (this.destroying) return
    if (this.destroyed) throw errCode(new Error('cannot removeStream after peer is destroyed'), 'ERR_DESTROYED')
    this._debug('removeSenders()')

    stream.getTracks().forEach(track => {
      this.removeTrack(track, stream)
    })
  }

  _needsNegotiation () {
    this._debug('_needsNegotiation')
    if (this._batchedNegotiation) return // batch synchronous renegotiations
    this._batchedNegotiation = true
    queueMicrotask(() => {
      this._batchedNegotiation = false
      if (this.initiator || !this._firstNegotiation) {
        this._debug('starting batched negotiation')
        this.negotiate()
      } else {
        this._debug('non-initiator initial negotiation request discarded')
      }
      this._firstNegotiation = false
    })
  }

  negotiate () {
    if (this.destroying) return
    if (this.destroyed) throw errCode(new Error('cannot negotiate after peer is destroyed'), 'ERR_DESTROYED')

    if (this.initiator) {
      if (this._isNegotiating) {
        this._queuedNegotiation = true
        this._debug('already negotiating, queueing')
      } else {
        this._debug('start negotiation')
        setTimeout(() => { // HACK: Chrome crashes if we immediately call createOffer
          this._createOffer()
        }, 0)
      }
    } else {
      if (this._isNegotiating) {
        this._queuedNegotiation = true
        this._debug('already negotiating, queueing')
      } else {
        this._debug('requesting negotiation from initiator')
        this.emit('signal', { // request initiator to renegotiate
          type: 'renegotiate',
          renegotiate: true
        })
      }
    }
    this._isNegotiating = true
  }

  // TODO: Delete this method once readable-stream is updated to contain a default
  // implementation of destroy() that automatically calls _destroy()
  // See: https://github.com/nodejs/readable-stream/issues/283
  destroy (err) {
    this._destroy(err, () => {})
  }

  _destroy (err, cb) {
    if (this.destroyed || this.destroying) return
    this.destroying = true

    this._debug('destroying (error: %s)', err && (err.message || err))

    queueMicrotask(() => { // allow events concurrent with the call to _destroy() to fire (see #692)
      this.destroyed = true
      this.destroying = false

      this._debug('destroy (error: %s)', err && (err.message || err))

      this.readable = this.writable = false

      if (!this._readableState.ended) this.push(null)
      if (!this._writableState.finished) this.end()

      this._connected = false
      this._pcReady = false
      this._channelReady = false
      this._remoteTracks = null
      this._remoteStreams = null
      this._senderMap = null

      clearInterval(this._closingInterval)
      this._closingInterval = null

      clearInterval(this._interval)
      this._interval = null
      this._chunk = null
      this._cb = null

      if (this._onFinishBound) this.removeListener('finish', this._onFinishBound)
      this._onFinishBound = null

      if (this._channel) {
        try {
          this._channel.close()
        } catch (err) {}

        // allow events concurrent with destruction to be handled
        this._channel.onmessage = null
        this._channel.onopen = null
        this._channel.onclose = null
        this._channel.onerror = null
      }
      if (this._pc) {
        try {
          this._pc.close()
        } catch (err) {}

        // allow events concurrent with destruction to be handled
        this._pc.oniceconnectionstatechange = null
        this._pc.onicegatheringstatechange = null
        this._pc.onsignalingstatechange = null
        this._pc.onicecandidate = null
        this._pc.ontrack = null
        this._pc.ondatachannel = null
      }
      this._pc = null
      this._channel = null

      if (err) this.emit('error', err)
      this.emit('close')
      cb()
    })
  }

  _setupData (event) {
    if (!event.channel) {
      // In some situations `pc.createDataChannel()` returns `undefined` (in wrtc),
      // which is invalid behavior. Handle it gracefully.
      // See: https://github.com/feross/simple-peer/issues/163
      return this.destroy(errCode(new Error('Data channel event is missing `channel` property'), 'ERR_DATA_CHANNEL'))
    }

    this._channel = event.channel
    this._channel.binaryType = 'arraybuffer'

    if (typeof this._channel.bufferedAmountLowThreshold === 'number') {
      this._channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT
    }

    this.channelName = this._channel.label

    this._channel.onmessage = event => {
      this._onChannelMessage(event)
    }
    this._channel.onbufferedamountlow = () => {
      this._onChannelBufferedAmountLow()
    }
    this._channel.onopen = () => {
      this._onChannelOpen()
    }
    this._channel.onclose = () => {
      this._onChannelClose()
    }
    this._channel.onerror = event => {
      const err = event.error instanceof Error
        ? event.error
        : new Error(`Datachannel error: ${event.message} ${event.filename}:${event.lineno}:${event.colno}`)
      this.destroy(errCode(err, 'ERR_DATA_CHANNEL'))
    }

    // HACK: Chrome will sometimes get stuck in readyState "closing", let's check for this condition
    // https://bugs.chromium.org/p/chromium/issues/detail?id=882743
    let isClosing = false
    this._closingInterval = setInterval(() => { // No "onclosing" event
      if (this._channel && this._channel.readyState === 'closing') {
        if (isClosing) this._onChannelClose() // closing timed out: equivalent to onclose firing
        isClosing = true
      } else {
        isClosing = false
      }
    }, CHANNEL_CLOSING_TIMEOUT)
  }

  _read () {}

  _write (chunk, encoding, cb) {
    if (this.destroyed) return cb(errCode(new Error('cannot write after peer is destroyed'), 'ERR_DATA_CHANNEL'))

    if (this._connected) {
      try {
        this.send(chunk)
      } catch (err) {
        return this.destroy(errCode(err, 'ERR_DATA_CHANNEL'))
      }
      if (this._channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        this._debug('start backpressure: bufferedAmount %d', this._channel.bufferedAmount)
        this._cb = cb
      } else {
        cb(null)
      }
    } else {
      this._debug('write before connect')
      this._chunk = chunk
      this._cb = cb
    }
  }

  // When stream finishes writing, close socket. Half open connections are not
  // supported.
  _onFinish () {
    if (this.destroyed) return

    // Wait a bit before destroying so the socket flushes.
    // TODO: is there a more reliable way to accomplish this?
    const destroySoon = () => {
      setTimeout(() => this.destroy(), 1000)
    }

    if (this._connected) {
      destroySoon()
    } else {
      this.once('connect', destroySoon)
    }
  }

  _startIceCompleteTimeout () {
    if (this.destroyed) return
    if (this._iceCompleteTimer) return
    this._debug('started iceComplete timeout')
    this._iceCompleteTimer = setTimeout(() => {
      if (!this._iceComplete) {
        this._iceComplete = true
        this._debug('iceComplete timeout completed')
        this.emit('iceTimeout')
        this.emit('_iceComplete')
      }
    }, this.iceCompleteTimeout)
  }

  _createOffer () {
    if (this.destroyed) return

    this._pc.createOffer(this.offerOptions)
      .then(offer => {
        if (this.destroyed) return
        if (!this.trickle && !this.allowHalfTrickle) offer.sdp = filterTrickle(offer.sdp)
        offer.sdp = this.sdpTransform(offer.sdp)

        const sendOffer = () => {
          if (this.destroyed) return
          const signal = this._pc.localDescription || offer
          this._debug('signal')
          this.emit('signal', {
            type: signal.type,
            sdp: signal.sdp
          })
        }

        const onSuccess = () => {
          this._debug('createOffer success')
          if (this.destroyed) return
          if (this.trickle || this._iceComplete) sendOffer()
          else this.once('_iceComplete', sendOffer) // wait for candidates
        }

        const onError = err => {
          this.destroy(errCode(err, 'ERR_SET_LOCAL_DESCRIPTION'))
        }

        this._pc.setLocalDescription(offer)
          .then(onSuccess)
          .catch(onError)
      })
      .catch(err => {
        this.destroy(errCode(err, 'ERR_CREATE_OFFER'))
      })
  }

  _requestMissingTransceivers () {
    if (this._pc.getTransceivers) {
      this._pc.getTransceivers().forEach(transceiver => {
        if (!transceiver.mid && transceiver.sender.track && !transceiver.requested) {
          transceiver.requested = true // HACK: Safari returns negotiated transceivers with a null mid
          this.addTransceiver(transceiver.sender.track.kind)
        }
      })
    }
  }

  _createAnswer () {
    if (this.destroyed) return

    this._pc.createAnswer(this.answerOptions)
      .then(answer => {
        if (this.destroyed) return
        if (!this.trickle && !this.allowHalfTrickle) answer.sdp = filterTrickle(answer.sdp)
        answer.sdp = this.sdpTransform(answer.sdp)

        const sendAnswer = () => {
          if (this.destroyed) return
          const signal = this._pc.localDescription || answer
          this._debug('signal')
          this.emit('signal', {
            type: signal.type,
            sdp: signal.sdp
          })
          if (!this.initiator) this._requestMissingTransceivers()
        }

        const onSuccess = () => {
          if (this.destroyed) return
          if (this.trickle || this._iceComplete) sendAnswer()
          else this.once('_iceComplete', sendAnswer)
        }

        const onError = err => {
          this.destroy(errCode(err, 'ERR_SET_LOCAL_DESCRIPTION'))
        }

        this._pc.setLocalDescription(answer)
          .then(onSuccess)
          .catch(onError)
      })
      .catch(err => {
        this.destroy(errCode(err, 'ERR_CREATE_ANSWER'))
      })
  }

  _onConnectionStateChange () {
    if (this.destroyed) return
    if (this._pc.connectionState === 'failed') {
      this.destroy(errCode(new Error('Connection failed.'), 'ERR_CONNECTION_FAILURE'))
    }
  }

  _onIceStateChange () {
    if (this.destroyed) return
    const iceConnectionState = this._pc.iceConnectionState
    const iceGatheringState = this._pc.iceGatheringState

    this._debug(
      'iceStateChange (connection: %s) (gathering: %s)',
      iceConnectionState,
      iceGatheringState
    )
    this.emit('iceStateChange', iceConnectionState, iceGatheringState)

    if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
      this._pcReady = true
      this._maybeReady()
    }
    if (iceConnectionState === 'failed') {
      this.destroy(errCode(new Error('Ice connection failed.'), 'ERR_ICE_CONNECTION_FAILURE'))
    }
    if (iceConnectionState === 'closed') {
      this.destroy(errCode(new Error('Ice connection closed.'), 'ERR_ICE_CONNECTION_CLOSED'))
    }
  }

  getStats (cb) {
    // statreports can come with a value array instead of properties
    const flattenValues = report => {
      if (Object.prototype.toString.call(report.values) === '[object Array]') {
        report.values.forEach(value => {
          Object.assign(report, value)
        })
      }
      return report
    }

    // Promise-based getStats() (standard)
    if (this._pc.getStats.length === 0 || this._isReactNativeWebrtc) {
      this._pc.getStats()
        .then(res => {
          const reports = []
          res.forEach(report => {
            reports.push(flattenValues(report))
          })
          cb(null, reports)
        }, err => cb(err))

    // Single-parameter callback-based getStats() (non-standard)
    } else if (this._pc.getStats.length > 0) {
      this._pc.getStats(res => {
        // If we destroy connection in `connect` callback this code might happen to run when actual connection is already closed
        if (this.destroyed) return

        const reports = []
        res.result().forEach(result => {
          const report = {}
          result.names().forEach(name => {
            report[name] = result.stat(name)
          })
          report.id = result.id
          report.type = result.type
          report.timestamp = result.timestamp
          reports.push(flattenValues(report))
        })
        cb(null, reports)
      }, err => cb(err))

    // Unknown browser, skip getStats() since it's anyone's guess which style of
    // getStats() they implement.
    } else {
      cb(null, [])
    }
  }

  _maybeReady () {
    this._debug('maybeReady pc %s channel %s', this._pcReady, this._channelReady)
    if (this._connected || this._connecting || !this._pcReady || !this._channelReady) return

    this._connecting = true

    // HACK: We can't rely on order here, for details see https://github.com/js-platform/node-webrtc/issues/339
    const findCandidatePair = () => {
      if (this.destroyed) return

      this.getStats((err, items) => {
        if (this.destroyed) return

        // Treat getStats error as non-fatal. It's not essential.
        if (err) items = []

        const remoteCandidates = {}
        const localCandidates = {}
        const candidatePairs = {}
        let foundSelectedCandidatePair = false

        items.forEach(item => {
          // TODO: Once all browsers support the hyphenated stats report types, remove
          // the non-hypenated ones
          if (item.type === 'remotecandidate' || item.type === 'remote-candidate') {
            remoteCandidates[item.id] = item
          }
          if (item.type === 'localcandidate' || item.type === 'local-candidate') {
            localCandidates[item.id] = item
          }
          if (item.type === 'candidatepair' || item.type === 'candidate-pair') {
            candidatePairs[item.id] = item
          }
        })

        const setSelectedCandidatePair = selectedCandidatePair => {
          foundSelectedCandidatePair = true

          let local = localCandidates[selectedCandidatePair.localCandidateId]

          if (local && (local.ip || local.address)) {
            // Spec
            this.localAddress = local.ip || local.address
            this.localPort = Number(local.port)
          } else if (local && local.ipAddress) {
            // Firefox
            this.localAddress = local.ipAddress
            this.localPort = Number(local.portNumber)
          } else if (typeof selectedCandidatePair.googLocalAddress === 'string') {
            // TODO: remove this once Chrome 58 is released
            local = selectedCandidatePair.googLocalAddress.split(':')
            this.localAddress = local[0]
            this.localPort = Number(local[1])
          }
          if (this.localAddress) {
            this.localFamily = this.localAddress.includes(':') ? 'IPv6' : 'IPv4'
          }

          let remote = remoteCandidates[selectedCandidatePair.remoteCandidateId]

          if (remote && (remote.ip || remote.address)) {
            // Spec
            this.remoteAddress = remote.ip || remote.address
            this.remotePort = Number(remote.port)
          } else if (remote && remote.ipAddress) {
            // Firefox
            this.remoteAddress = remote.ipAddress
            this.remotePort = Number(remote.portNumber)
          } else if (typeof selectedCandidatePair.googRemoteAddress === 'string') {
            // TODO: remove this once Chrome 58 is released
            remote = selectedCandidatePair.googRemoteAddress.split(':')
            this.remoteAddress = remote[0]
            this.remotePort = Number(remote[1])
          }
          if (this.remoteAddress) {
            this.remoteFamily = this.remoteAddress.includes(':') ? 'IPv6' : 'IPv4'
          }

          this._debug(
            'connect local: %s:%s remote: %s:%s',
            this.localAddress,
            this.localPort,
            this.remoteAddress,
            this.remotePort
          )
        }

        items.forEach(item => {
          // Spec-compliant
          if (item.type === 'transport' && item.selectedCandidatePairId) {
            setSelectedCandidatePair(candidatePairs[item.selectedCandidatePairId])
          }

          // Old implementations
          if (
            (item.type === 'googCandidatePair' && item.googActiveConnection === 'true') ||
            ((item.type === 'candidatepair' || item.type === 'candidate-pair') && item.selected)
          ) {
            setSelectedCandidatePair(item)
          }
        })

        // Ignore candidate pair selection in browsers like Safari 11 that do not have any local or remote candidates
        // But wait until at least 1 candidate pair is available
        if (!foundSelectedCandidatePair && (!Object.keys(candidatePairs).length || Object.keys(localCandidates).length)) {
          setTimeout(findCandidatePair, 100)
          return
        } else {
          this._connecting = false
          this._connected = true
        }

        if (this._chunk) {
          try {
            this.send(this._chunk)
          } catch (err) {
            return this.destroy(errCode(err, 'ERR_DATA_CHANNEL'))
          }
          this._chunk = null
          this._debug('sent chunk from "write before connect"')

          const cb = this._cb
          this._cb = null
          cb(null)
        }

        // If `bufferedAmountLowThreshold` and 'onbufferedamountlow' are unsupported,
        // fallback to using setInterval to implement backpressure.
        if (typeof this._channel.bufferedAmountLowThreshold !== 'number') {
          this._interval = setInterval(() => this._onInterval(), 150)
          if (this._interval.unref) this._interval.unref()
        }

        this._debug('connect')
        this.emit('connect')
      })
    }
    findCandidatePair()
  }

  _onInterval () {
    if (!this._cb || !this._channel || this._channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      return
    }
    this._onChannelBufferedAmountLow()
  }

  _onSignalingStateChange () {
    if (this.destroyed) return

    if (this._pc.signalingState === 'stable') {
      this._isNegotiating = false

      // HACK: Firefox doesn't yet support removing tracks when signalingState !== 'stable'
      this._debug('flushing sender queue', this._sendersAwaitingStable)
      this._sendersAwaitingStable.forEach(sender => {
        this._pc.removeTrack(sender)
        this._queuedNegotiation = true
      })
      this._sendersAwaitingStable = []

      if (this._queuedNegotiation) {
        this._debug('flushing negotiation queue')
        this._queuedNegotiation = false
        this._needsNegotiation() // negotiate again
      } else {
        this._debug('negotiated')
        this.emit('negotiated')
      }
    }

    this._debug('signalingStateChange %s', this._pc.signalingState)
    this.emit('signalingStateChange', this._pc.signalingState)
  }

  _onIceCandidate (event) {
    if (this.destroyed) return
    if (event.candidate && this.trickle) {
      this.emit('signal', {
        type: 'candidate',
        candidate: {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid
        }
      })
    } else if (!event.candidate && !this._iceComplete) {
      this._iceComplete = true
      this.emit('_iceComplete')
    }
    // as soon as we've received one valid candidate start timeout
    if (event.candidate) {
      this._startIceCompleteTimeout()
    }
  }

  _onChannelMessage (event) {
    if (this.destroyed) return
    let data = event.data
    if (data instanceof ArrayBuffer) data = Buffer.from(data)
    this.push(data)
  }

  _onChannelBufferedAmountLow () {
    if (this.destroyed || !this._cb) return
    this._debug('ending backpressure: bufferedAmount %d', this._channel.bufferedAmount)
    const cb = this._cb
    this._cb = null
    cb(null)
  }

  _onChannelOpen () {
    if (this._connected || this.destroyed) return
    this._debug('on channel open')
    this._channelReady = true
    this._maybeReady()
  }

  _onChannelClose () {
    if (this.destroyed) return
    this._debug('on channel close')
    this.destroy()
  }

  _onTrack (event) {
    if (this.destroyed) return

    event.streams.forEach(eventStream => {
      this._debug('on track')
      this.emit('track', event.track, eventStream)

      this._remoteTracks.push({
        track: event.track,
        stream: eventStream
      })

      if (this._remoteStreams.some(remoteStream => {
        return remoteStream.id === eventStream.id
      })) return // Only fire one 'stream' event, even though there may be multiple tracks per stream

      this._remoteStreams.push(eventStream)
      queueMicrotask(() => {
        this._debug('on stream')
        this.emit('stream', eventStream) // ensure all tracks have been added
      })
    })
  }

  _debug () {
    const args = [].slice.call(arguments)
    args[0] = '[' + this._id + '] ' + args[0]
    debug.apply(null, args)
  }
}

Peer.WEBRTC_SUPPORT = !!getBrowserRTC()

/**
 * Expose peer and data channel config for overriding all Peer
 * instances. Otherwise, just set opts.config or opts.channelConfig
 * when constructing a Peer.
 */
Peer.config = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:global.stun.twilio.com:3478'
      ]
    }
  ],
  sdpSemantics: 'unified-plan'
}

Peer.channelConfig = {}

module.exports = Peer


/***/ }),

/***/ 522:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(8764)["Buffer"];
/*! simple-websocket. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
/* global WebSocket */

const debug = __webpack_require__(1227)('simple-websocket')
const randombytes = __webpack_require__(1798)
const stream = __webpack_require__(8473)
const queueMicrotask = __webpack_require__(4375) // TODO: remove when Node 10 is not supported
const ws = __webpack_require__(3719) // websockets in node - will be empty object in browser

const _WebSocket = typeof ws !== 'function' ? WebSocket : ws

const MAX_BUFFERED_AMOUNT = 64 * 1024

/**
 * WebSocket. Same API as node core `net.Socket`. Duplex stream.
 * @param {Object} opts
 * @param {string=} opts.url websocket server url
 * @param {string=} opts.socket raw websocket instance to wrap
 */
class Socket extends stream.Duplex {
  constructor (opts = {}) {
    // Support simple usage: `new Socket(url)`
    if (typeof opts === 'string') {
      opts = { url: opts }
    }

    opts = Object.assign({
      allowHalfOpen: false
    }, opts)

    super(opts)

    if (opts.url == null && opts.socket == null) {
      throw new Error('Missing required `url` or `socket` option')
    }
    if (opts.url != null && opts.socket != null) {
      throw new Error('Must specify either `url` or `socket` option, not both')
    }

    this._id = randombytes(4).toString('hex').slice(0, 7)
    this._debug('new websocket: %o', opts)

    this.connected = false
    this.destroyed = false

    this._chunk = null
    this._cb = null
    this._interval = null

    if (opts.socket) {
      this.url = opts.socket.url
      this._ws = opts.socket
      this.connected = opts.socket.readyState === _WebSocket.OPEN
    } else {
      this.url = opts.url
      try {
        if (typeof ws === 'function') {
          // `ws` package accepts options
          this._ws = new _WebSocket(opts.url, null, {
            ...opts,
            encoding: undefined // encoding option breaks ws internals
          })
        } else {
          this._ws = new _WebSocket(opts.url)
        }
      } catch (err) {
        queueMicrotask(() => this.destroy(err))
        return
      }
    }

    this._ws.binaryType = 'arraybuffer'

    if (opts.socket && this.connected) {
      queueMicrotask(() => this._handleOpen())
    } else {
      this._ws.onopen = () => this._handleOpen()
    }

    this._ws.onmessage = event => this._handleMessage(event)
    this._ws.onclose = () => this._handleClose()
    this._ws.onerror = err => this._handleError(err)

    this._handleFinishBound = () => this._handleFinish()
    this.once('finish', this._handleFinishBound)
  }

  /**
   * Send text/binary data to the WebSocket server.
   * @param {TypedArrayView|ArrayBuffer|Buffer|string|Blob|Object} chunk
   */
  send (chunk) {
    this._ws.send(chunk)
  }

  // TODO: Delete this method once readable-stream is updated to contain a default
  // implementation of destroy() that automatically calls _destroy()
  // See: https://github.com/nodejs/readable-stream/issues/283
  destroy (err) {
    this._destroy(err, () => {})
  }

  _destroy (err, cb) {
    if (this.destroyed) return

    this._debug('destroy (error: %s)', err && (err.message || err))

    this.readable = this.writable = false
    if (!this._readableState.ended) this.push(null)
    if (!this._writableState.finished) this.end()

    this.connected = false
    this.destroyed = true

    clearInterval(this._interval)
    this._interval = null
    this._chunk = null
    this._cb = null

    if (this._handleFinishBound) {
      this.removeListener('finish', this._handleFinishBound)
    }
    this._handleFinishBound = null

    if (this._ws) {
      const ws = this._ws
      const onClose = () => {
        ws.onclose = null
      }
      if (ws.readyState === _WebSocket.CLOSED) {
        onClose()
      } else {
        try {
          ws.onclose = onClose
          ws.close()
        } catch (err) {
          onClose()
        }
      }

      ws.onopen = null
      ws.onmessage = null
      ws.onerror = () => {}
    }
    this._ws = null

    if (err) this.emit('error', err)
    this.emit('close')
    cb()
  }

  _read () {}

  _write (chunk, encoding, cb) {
    if (this.destroyed) return cb(new Error('cannot write after socket is destroyed'))

    if (this.connected) {
      try {
        this.send(chunk)
      } catch (err) {
        return this.destroy(err)
      }
      if (typeof ws !== 'function' && this._ws.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        this._debug('start backpressure: bufferedAmount %d', this._ws.bufferedAmount)
        this._cb = cb
      } else {
        cb(null)
      }
    } else {
      this._debug('write before connect')
      this._chunk = chunk
      this._cb = cb
    }
  }

  _handleOpen () {
    if (this.connected || this.destroyed) return
    this.connected = true

    if (this._chunk) {
      try {
        this.send(this._chunk)
      } catch (err) {
        return this.destroy(err)
      }
      this._chunk = null
      this._debug('sent chunk from "write before connect"')

      const cb = this._cb
      this._cb = null
      cb(null)
    }

    // Backpressure is not implemented in Node.js. The `ws` module has a buggy
    // `bufferedAmount` property. See: https://github.com/websockets/ws/issues/492
    if (typeof ws !== 'function') {
      this._interval = setInterval(() => this._onInterval(), 150)
      if (this._interval.unref) this._interval.unref()
    }

    this._debug('connect')
    this.emit('connect')
  }

  _handleMessage (event) {
    if (this.destroyed) return
    let data = event.data
    if (data instanceof ArrayBuffer) data = Buffer.from(data)
    this.push(data)
  }

  _handleClose () {
    if (this.destroyed) return
    this._debug('on close')
    this.destroy()
  }

  _handleError (_) {
    this.destroy(new Error(`Error connecting to ${this.url}`))
  }

  // When stream finishes writing, close socket. Half open connections are not
  // supported.
  _handleFinish () {
    if (this.destroyed) return

    // Wait a bit before destroying so the socket flushes.
    // TODO: is there a more reliable way to accomplish this?
    const destroySoon = () => {
      setTimeout(() => this.destroy(), 1000)
    }

    if (this.connected) {
      destroySoon()
    } else {
      this.once('connect', destroySoon)
    }
  }

  _onInterval () {
    if (!this._cb || !this._ws || this._ws.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      return
    }
    this._debug('ending backpressure: bufferedAmount %d', this._ws.bufferedAmount)
    const cb = this._cb
    this._cb = null
    cb(null)
  }

  _debug () {
    const args = [].slice.call(arguments)
    args[0] = '[' + this._id + '] ' + args[0]
    debug.apply(null, args)
  }
}

Socket.WEBSOCKET_SUPPORT = !!_WebSocket

module.exports = Socket


/***/ }),

/***/ 558:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const Throttle = __webpack_require__(7768)
const ThrottleGroup = __webpack_require__(9929)

module.exports = {
  Throttle,
  ThrottleGroup
}


/***/ }),

/***/ 9929:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { TokenBucket } = __webpack_require__(5516)
const Throttle = __webpack_require__(7768)

class ThrottleGroup {
  constructor (opts = {}) {
    if (typeof opts !== 'object') throw new Error('Options must be an object')

    this.throttles = []
    this.setEnabled(opts.enabled)
    this.setRate(opts.rate, opts.chunksize)
  }

  getEnabled () {
    return this._enabled
  }

  getRate () {
    // Note: bucketSize === tokensPerInterval
    return this.bucket.tokensPerInterval
  }

  getChunksize () {
    return this.chunksize
  }

  setEnabled (val = true) {
    if (typeof val !== 'boolean') throw new Error('Enabled must be a boolean')

    this._enabled = val
    for (const throttle of this.throttles) {
      throttle.setEnabled(val)
    }
  }

  setRate (rate, chunksize = null) {
    // Note: rate = 0, means we should stop processing chunks
    if (!Number.isInteger(rate) || rate < 0) throw new Error('Rate must be an integer bigger than zero')
    rate = parseInt(rate)

    if (chunksize && (typeof chunksize !== 'number' || chunksize <= 0)) throw new Error('Chunksize must be bigger than zero')
    chunksize = chunksize || Math.max(parseInt(rate / 10), 1)
    chunksize = parseInt(chunksize)
    if (rate > 0 && chunksize > rate) throw new Error('Chunk size must be smaller than rate')

    if (!this.bucket) this.bucket = new TokenBucket(rate, rate, 'second', null)

    this.bucket.bucketSize = rate
    this.bucket.tokensPerInterval = rate
    this.chunksize = chunksize
  }

  setChunksize (chunksize) {
    if (!Number.isInteger(chunksize) || chunksize <= 0) throw new Error('Chunk size must be an integer bigger than zero')
    const rate = this.getRate()
    chunksize = parseInt(chunksize)
    if (rate > 0 && chunksize > rate) throw new Error('Chunk size must be smaller than rate')
    this.chunksize = chunksize
  }

  throttle (opts = {}) {
    if (typeof opts !== 'object') throw new Error('Options must be an object')

    const newThrottle = new Throttle({
      ...opts,
      group: this
    })

    return newThrottle
  }

  destroy () {
    for (const throttle of this.throttles) {
      throttle.destroy()
    }

    this.throttles = []
  }

  _addThrottle (throttle) {
    if (!(throttle instanceof Throttle)) throw new Error('Throttle must be an instance of Throttle')

    this.throttles.push(throttle)
  }

  _removeThrottle (throttle) {
    const index = this.throttles.indexOf(throttle)
    if (index > -1) this.throttles.splice(index, 1)
  }
}

module.exports = ThrottleGroup


/***/ }),

/***/ 7768:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { EventEmitter } = __webpack_require__(7187)
const { Transform } = __webpack_require__(1237)
const { wait } = __webpack_require__(5324)

class Throttle extends Transform {
  constructor (opts = {}) {
    super()

    if (typeof opts !== 'object') throw new Error('Options must be an object')

    const params = Object.assign({}, opts)

    if (params.group && !(params.group instanceof ThrottleGroup)) throw new Error('Group must be an instanece of ThrottleGroup')
    else if (!params.group) params.group = new ThrottleGroup(params)

    this._setEnabled(params.enabled || params.group.enabled)
    this._group = params.group
    this._emitter = new EventEmitter()
    this._destroyed = false

    this._group._addThrottle(this)
  }

  getEnabled () {
    return this._enabled
  }

  getGroup () {
    return this._group
  }

  _setEnabled (val = true) {
    if (typeof val !== 'boolean') throw new Error('Enabled must be a boolean')
    this._enabled = val
  }

  setEnabled (val) {
    this._setEnabled(val)
    if (this._enabled) this._emitter.emit('enabled')
    else this._emitter.emit('disabled')
  }

  _transform (chunk, done) {
    this._processChunk(chunk, done)
  }

  /* async _waitForPositiveRate () {
    // Stop pushing chunks if rate is zero
    while (this._group.getRate() === 0 && !this._destroyed && this._areBothEnabled()) {
      await wait(1 * 1000) // wait 1 second
    }
  } */

  async _waitForTokens (amount) {
    // Wait for enabled, destroyed or tokens
    return new Promise((resolve, reject) => {
      let done = false
      const self = this
      function isDone (err) {
        self._emitter.removeListener('disabled', isDone)
        self._emitter.removeListener('destroyed', isDone)

        if (done) return
        done = true
        if (err) return reject(err)
        resolve()
      }
      this._emitter.once('disabled', isDone)
      this._emitter.once('destroyed', isDone)
      // TODO: next version remove lisener in "isDone"
      this._group.bucket.removeTokens(amount, isDone)
    })
  }

  _areBothEnabled () {
    return this._enabled && this._group.getEnabled()
  }

  /* async _throttleChunk (size) {
    // Stop pushing chunks if rate is zero
    await this._waitForPositiveRate()
    if (this._destroyed) return
    if (!this._areBothEnabled()) return

    // Get tokens from bucket
    await this._waitForTokens(size)
  } */

  async _processChunk (chunk, done) {
    if (!this._areBothEnabled()) return done(null, chunk)

    let pos = 0
    let chunksize = this._group.getChunksize()
    let slice = chunk.slice(pos, pos + chunksize)
    while (slice.length > 0) {
      // Check here again because we might be in the middle of a big chunk
      // with a lot of small slices
      if (this._areBothEnabled()) {
        try {
          // WAIT FOR POSITIVE RATE
          // Stop pushing chunks if rate is zero
          while (this._group.getRate() === 0 && !this._destroyed && this._areBothEnabled()) {
            await wait(1000) // wait 1 second
            if (this._destroyed) return
          }

          // WAIT FOR TOKENS
          if (this._areBothEnabled() && !this._group.bucket.tryRemoveTokens(slice.length)) {
            await this._waitForTokens(slice.length)
            if (this._destroyed) return
          }
        } catch (err) {
          return done(err)
        }
      }

      this.push(slice)
      pos += chunksize

      // Calculate params for next slice
      chunksize = (this._areBothEnabled())
        ? this._group.getChunksize() // Chunksize might have changed
        : chunk.length - pos // Get the rest of the chunk
      slice = chunk.slice(pos, pos + chunksize)
    }

    return done()
  }

  destroy (...args) {
    this._group._removeThrottle(this)

    this._destroyed = true
    this._emitter.emit('destroyed')

    super.destroy(...args)
  }
}

module.exports = Throttle

// Fix circular dependency
const ThrottleGroup = __webpack_require__(9929)


/***/ }),

/***/ 5324:
/***/ ((module) => {

function wait (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

module.exports = {
  wait
}


/***/ }),

/***/ 1237:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { EventEmitter } = __webpack_require__(7187)
const STREAM_DESTROYED = new Error('Stream was destroyed')
const PREMATURE_CLOSE = new Error('Premature close')

const queueTick = __webpack_require__(3527)
const FIFO = __webpack_require__(1607)

/* eslint-disable no-multi-spaces */

// 26 bits used total (4 from shared, 13 from read, and 9 from write)
const MAX = ((1 << 26) - 1)

// Shared state
const OPENING       = 0b0001
const PREDESTROYING = 0b0010
const DESTROYING    = 0b0100
const DESTROYED     = 0b1000

const NOT_OPENING = MAX ^ OPENING
const NOT_PREDESTROYING = MAX ^ PREDESTROYING

// Read state (4 bit offset from shared state)
const READ_ACTIVE           = 0b0000000000001 << 4
const READ_PRIMARY          = 0b0000000000010 << 4
const READ_SYNC             = 0b0000000000100 << 4
const READ_QUEUED           = 0b0000000001000 << 4
const READ_RESUMED          = 0b0000000010000 << 4
const READ_PIPE_DRAINED     = 0b0000000100000 << 4
const READ_ENDING           = 0b0000001000000 << 4
const READ_EMIT_DATA        = 0b0000010000000 << 4
const READ_EMIT_READABLE    = 0b0000100000000 << 4
const READ_EMITTED_READABLE = 0b0001000000000 << 4
const READ_DONE             = 0b0010000000000 << 4
const READ_NEXT_TICK        = 0b0100000000001 << 4 // also active
const READ_NEEDS_PUSH       = 0b1000000000000 << 4

// Combined read state
const READ_FLOWING = READ_RESUMED | READ_PIPE_DRAINED
const READ_ACTIVE_AND_SYNC = READ_ACTIVE | READ_SYNC
const READ_ACTIVE_AND_SYNC_AND_NEEDS_PUSH = READ_ACTIVE | READ_SYNC | READ_NEEDS_PUSH
const READ_PRIMARY_AND_ACTIVE = READ_PRIMARY | READ_ACTIVE
const READ_EMIT_READABLE_AND_QUEUED = READ_EMIT_READABLE | READ_QUEUED

const READ_NOT_ACTIVE             = MAX ^ READ_ACTIVE
const READ_NON_PRIMARY            = MAX ^ READ_PRIMARY
const READ_NON_PRIMARY_AND_PUSHED = MAX ^ (READ_PRIMARY | READ_NEEDS_PUSH)
const READ_NOT_SYNC               = MAX ^ READ_SYNC
const READ_PUSHED                 = MAX ^ READ_NEEDS_PUSH
const READ_PAUSED                 = MAX ^ READ_RESUMED
const READ_NOT_QUEUED             = MAX ^ (READ_QUEUED | READ_EMITTED_READABLE)
const READ_NOT_ENDING             = MAX ^ READ_ENDING
const READ_PIPE_NOT_DRAINED       = MAX ^ READ_FLOWING
const READ_NOT_NEXT_TICK          = MAX ^ READ_NEXT_TICK

// Write state (17 bit offset, 4 bit offset from shared state and 13 from read state)
const WRITE_ACTIVE     = 0b000000001 << 17
const WRITE_PRIMARY    = 0b000000010 << 17
const WRITE_SYNC       = 0b000000100 << 17
const WRITE_QUEUED     = 0b000001000 << 17
const WRITE_UNDRAINED  = 0b000010000 << 17
const WRITE_DONE       = 0b000100000 << 17
const WRITE_EMIT_DRAIN = 0b001000000 << 17
const WRITE_NEXT_TICK  = 0b010000001 << 17 // also active
const WRITE_FINISHING  = 0b100000000 << 17

const WRITE_NOT_ACTIVE    = MAX ^ WRITE_ACTIVE
const WRITE_NOT_SYNC      = MAX ^ WRITE_SYNC
const WRITE_NON_PRIMARY   = MAX ^ WRITE_PRIMARY
const WRITE_NOT_FINISHING = MAX ^ WRITE_FINISHING
const WRITE_DRAINED       = MAX ^ WRITE_UNDRAINED
const WRITE_NOT_QUEUED    = MAX ^ WRITE_QUEUED
const WRITE_NOT_NEXT_TICK = MAX ^ WRITE_NEXT_TICK

// Combined shared state
const ACTIVE = READ_ACTIVE | WRITE_ACTIVE
const NOT_ACTIVE = MAX ^ ACTIVE
const DONE = READ_DONE | WRITE_DONE
const DESTROY_STATUS = DESTROYING | DESTROYED | PREDESTROYING
const OPEN_STATUS = DESTROY_STATUS | OPENING
const AUTO_DESTROY = DESTROY_STATUS | DONE
const NON_PRIMARY = WRITE_NON_PRIMARY & READ_NON_PRIMARY
const ACTIVE_OR_TICKING = WRITE_NEXT_TICK | READ_NEXT_TICK
const TICKING = ACTIVE_OR_TICKING & NOT_ACTIVE
const IS_OPENING = OPEN_STATUS | TICKING

// Combined shared state and read state
const READ_PRIMARY_STATUS = OPEN_STATUS | READ_ENDING | READ_DONE
const READ_STATUS = OPEN_STATUS | READ_DONE | READ_QUEUED
const READ_ENDING_STATUS = OPEN_STATUS | READ_ENDING | READ_QUEUED
const READ_READABLE_STATUS = OPEN_STATUS | READ_EMIT_READABLE | READ_QUEUED | READ_EMITTED_READABLE
const SHOULD_NOT_READ = OPEN_STATUS | READ_ACTIVE | READ_ENDING | READ_DONE | READ_NEEDS_PUSH
const READ_BACKPRESSURE_STATUS = DESTROY_STATUS | READ_ENDING | READ_DONE

// Combined write state
const WRITE_PRIMARY_STATUS = OPEN_STATUS | WRITE_FINISHING | WRITE_DONE
const WRITE_QUEUED_AND_UNDRAINED = WRITE_QUEUED | WRITE_UNDRAINED
const WRITE_QUEUED_AND_ACTIVE = WRITE_QUEUED | WRITE_ACTIVE
const WRITE_DRAIN_STATUS = WRITE_QUEUED | WRITE_UNDRAINED | OPEN_STATUS | WRITE_ACTIVE
const WRITE_STATUS = OPEN_STATUS | WRITE_ACTIVE | WRITE_QUEUED
const WRITE_PRIMARY_AND_ACTIVE = WRITE_PRIMARY | WRITE_ACTIVE
const WRITE_ACTIVE_AND_SYNC = WRITE_ACTIVE | WRITE_SYNC
const WRITE_FINISHING_STATUS = OPEN_STATUS | WRITE_FINISHING | WRITE_QUEUED_AND_ACTIVE | WRITE_DONE
const WRITE_BACKPRESSURE_STATUS = WRITE_UNDRAINED | DESTROY_STATUS | WRITE_FINISHING | WRITE_DONE

const asyncIterator = Symbol.asyncIterator || Symbol('asyncIterator')

class WritableState {
  constructor (stream, { highWaterMark = 16384, map = null, mapWritable, byteLength, byteLengthWritable } = {}) {
    this.stream = stream
    this.queue = new FIFO()
    this.highWaterMark = highWaterMark
    this.buffered = 0
    this.error = null
    this.pipeline = null
    this.byteLength = byteLengthWritable || byteLength || defaultByteLength
    this.map = mapWritable || map
    this.afterWrite = afterWrite.bind(this)
    this.afterUpdateNextTick = updateWriteNT.bind(this)
  }

  get ended () {
    return (this.stream._duplexState & WRITE_DONE) !== 0
  }

  push (data) {
    if (this.map !== null) data = this.map(data)

    this.buffered += this.byteLength(data)
    this.queue.push(data)

    if (this.buffered < this.highWaterMark) {
      this.stream._duplexState |= WRITE_QUEUED
      return true
    }

    this.stream._duplexState |= WRITE_QUEUED_AND_UNDRAINED
    return false
  }

  shift () {
    const data = this.queue.shift()
    const stream = this.stream

    this.buffered -= this.byteLength(data)
    if (this.buffered === 0) stream._duplexState &= WRITE_NOT_QUEUED

    return data
  }

  end (data) {
    if (typeof data === 'function') this.stream.once('finish', data)
    else if (data !== undefined && data !== null) this.push(data)
    this.stream._duplexState = (this.stream._duplexState | WRITE_FINISHING) & WRITE_NON_PRIMARY
  }

  autoBatch (data, cb) {
    const buffer = []
    const stream = this.stream

    buffer.push(data)
    while ((stream._duplexState & WRITE_STATUS) === WRITE_QUEUED_AND_ACTIVE) {
      buffer.push(stream._writableState.shift())
    }

    if ((stream._duplexState & OPEN_STATUS) !== 0) return cb(null)
    stream._writev(buffer, cb)
  }

  update () {
    const stream = this.stream

    while ((stream._duplexState & WRITE_STATUS) === WRITE_QUEUED) {
      const data = this.shift()
      stream._duplexState |= WRITE_ACTIVE_AND_SYNC
      stream._write(data, this.afterWrite)
      stream._duplexState &= WRITE_NOT_SYNC
    }

    if ((stream._duplexState & WRITE_PRIMARY_AND_ACTIVE) === 0) this.updateNonPrimary()
  }

  updateNonPrimary () {
    const stream = this.stream

    if ((stream._duplexState & WRITE_FINISHING_STATUS) === WRITE_FINISHING) {
      stream._duplexState = (stream._duplexState | WRITE_ACTIVE) & WRITE_NOT_FINISHING
      stream._final(afterFinal.bind(this))
      return
    }

    if ((stream._duplexState & DESTROY_STATUS) === DESTROYING) {
      if ((stream._duplexState & ACTIVE_OR_TICKING) === 0) {
        stream._duplexState |= ACTIVE
        stream._destroy(afterDestroy.bind(this))
      }
      return
    }

    if ((stream._duplexState & IS_OPENING) === OPENING) {
      stream._duplexState = (stream._duplexState | ACTIVE) & NOT_OPENING
      stream._open(afterOpen.bind(this))
    }
  }

  updateNextTick () {
    if ((this.stream._duplexState & WRITE_NEXT_TICK) !== 0) return
    this.stream._duplexState |= WRITE_NEXT_TICK
    queueTick(this.afterUpdateNextTick)
  }
}

class ReadableState {
  constructor (stream, { highWaterMark = 16384, map = null, mapReadable, byteLength, byteLengthReadable } = {}) {
    this.stream = stream
    this.queue = new FIFO()
    this.highWaterMark = highWaterMark
    this.buffered = 0
    this.error = null
    this.pipeline = null
    this.byteLength = byteLengthReadable || byteLength || defaultByteLength
    this.map = mapReadable || map
    this.pipeTo = null
    this.afterRead = afterRead.bind(this)
    this.afterUpdateNextTick = updateReadNT.bind(this)
  }

  get ended () {
    return (this.stream._duplexState & READ_DONE) !== 0
  }

  pipe (pipeTo, cb) {
    if (this.pipeTo !== null) throw new Error('Can only pipe to one destination')
    if (typeof cb !== 'function') cb = null

    this.stream._duplexState |= READ_PIPE_DRAINED
    this.pipeTo = pipeTo
    this.pipeline = new Pipeline(this.stream, pipeTo, cb)

    if (cb) this.stream.on('error', noop) // We already error handle this so supress crashes

    if (isStreamx(pipeTo)) {
      pipeTo._writableState.pipeline = this.pipeline
      if (cb) pipeTo.on('error', noop) // We already error handle this so supress crashes
      pipeTo.on('finish', this.pipeline.finished.bind(this.pipeline)) // TODO: just call finished from pipeTo itself
    } else {
      const onerror = this.pipeline.done.bind(this.pipeline, pipeTo)
      const onclose = this.pipeline.done.bind(this.pipeline, pipeTo, null) // onclose has a weird bool arg
      pipeTo.on('error', onerror)
      pipeTo.on('close', onclose)
      pipeTo.on('finish', this.pipeline.finished.bind(this.pipeline))
    }

    pipeTo.on('drain', afterDrain.bind(this))
    this.stream.emit('piping', pipeTo)
    pipeTo.emit('pipe', this.stream)
  }

  push (data) {
    const stream = this.stream

    if (data === null) {
      this.highWaterMark = 0
      stream._duplexState = (stream._duplexState | READ_ENDING) & READ_NON_PRIMARY_AND_PUSHED
      return false
    }

    if (this.map !== null) data = this.map(data)
    this.buffered += this.byteLength(data)
    this.queue.push(data)

    stream._duplexState = (stream._duplexState | READ_QUEUED) & READ_PUSHED

    return this.buffered < this.highWaterMark
  }

  shift () {
    const data = this.queue.shift()

    this.buffered -= this.byteLength(data)
    if (this.buffered === 0) this.stream._duplexState &= READ_NOT_QUEUED
    return data
  }

  unshift (data) {
    let tail
    const pending = []

    while ((tail = this.queue.shift()) !== undefined) {
      pending.push(tail)
    }

    this.push(data)

    for (let i = 0; i < pending.length; i++) {
      this.queue.push(pending[i])
    }
  }

  read () {
    const stream = this.stream

    if ((stream._duplexState & READ_STATUS) === READ_QUEUED) {
      const data = this.shift()
      if (this.pipeTo !== null && this.pipeTo.write(data) === false) stream._duplexState &= READ_PIPE_NOT_DRAINED
      if ((stream._duplexState & READ_EMIT_DATA) !== 0) stream.emit('data', data)
      return data
    }

    return null
  }

  drain () {
    const stream = this.stream

    while ((stream._duplexState & READ_STATUS) === READ_QUEUED && (stream._duplexState & READ_FLOWING) !== 0) {
      const data = this.shift()
      if (this.pipeTo !== null && this.pipeTo.write(data) === false) stream._duplexState &= READ_PIPE_NOT_DRAINED
      if ((stream._duplexState & READ_EMIT_DATA) !== 0) stream.emit('data', data)
    }
  }

  update () {
    const stream = this.stream

    this.drain()

    while (this.buffered < this.highWaterMark && (stream._duplexState & SHOULD_NOT_READ) === 0) {
      stream._duplexState |= READ_ACTIVE_AND_SYNC_AND_NEEDS_PUSH
      stream._read(this.afterRead)
      stream._duplexState &= READ_NOT_SYNC
      if ((stream._duplexState & READ_ACTIVE) === 0) this.drain()
    }

    if ((stream._duplexState & READ_READABLE_STATUS) === READ_EMIT_READABLE_AND_QUEUED) {
      stream._duplexState |= READ_EMITTED_READABLE
      stream.emit('readable')
    }

    if ((stream._duplexState & READ_PRIMARY_AND_ACTIVE) === 0) this.updateNonPrimary()
  }

  updateNonPrimary () {
    const stream = this.stream

    if ((stream._duplexState & READ_ENDING_STATUS) === READ_ENDING) {
      stream._duplexState = (stream._duplexState | READ_DONE) & READ_NOT_ENDING
      stream.emit('end')
      if ((stream._duplexState & AUTO_DESTROY) === DONE) stream._duplexState |= DESTROYING
      if (this.pipeTo !== null) this.pipeTo.end()
    }

    if ((stream._duplexState & DESTROY_STATUS) === DESTROYING) {
      if ((stream._duplexState & ACTIVE_OR_TICKING) === 0) {
        stream._duplexState |= ACTIVE
        stream._destroy(afterDestroy.bind(this))
      }
      return
    }

    if ((stream._duplexState & IS_OPENING) === OPENING) {
      stream._duplexState = (stream._duplexState | ACTIVE) & NOT_OPENING
      stream._open(afterOpen.bind(this))
    }
  }

  updateNextTick () {
    if ((this.stream._duplexState & READ_NEXT_TICK) !== 0) return
    this.stream._duplexState |= READ_NEXT_TICK
    queueTick(this.afterUpdateNextTick)
  }
}

class TransformState {
  constructor (stream) {
    this.data = null
    this.afterTransform = afterTransform.bind(stream)
    this.afterFinal = null
  }
}

class Pipeline {
  constructor (src, dst, cb) {
    this.from = src
    this.to = dst
    this.afterPipe = cb
    this.error = null
    this.pipeToFinished = false
  }

  finished () {
    this.pipeToFinished = true
  }

  done (stream, err) {
    if (err) this.error = err

    if (stream === this.to) {
      this.to = null

      if (this.from !== null) {
        if ((this.from._duplexState & READ_DONE) === 0 || !this.pipeToFinished) {
          this.from.destroy(this.error || new Error('Writable stream closed prematurely'))
        }
        return
      }
    }

    if (stream === this.from) {
      this.from = null

      if (this.to !== null) {
        if ((stream._duplexState & READ_DONE) === 0) {
          this.to.destroy(this.error || new Error('Readable stream closed before ending'))
        }
        return
      }
    }

    if (this.afterPipe !== null) this.afterPipe(this.error)
    this.to = this.from = this.afterPipe = null
  }
}

function afterDrain () {
  this.stream._duplexState |= READ_PIPE_DRAINED
  if ((this.stream._duplexState & READ_ACTIVE_AND_SYNC) === 0) this.updateNextTick()
  else this.drain()
}

function afterFinal (err) {
  const stream = this.stream
  if (err) stream.destroy(err)
  if ((stream._duplexState & DESTROY_STATUS) === 0) {
    stream._duplexState |= WRITE_DONE
    stream.emit('finish')
  }
  if ((stream._duplexState & AUTO_DESTROY) === DONE) {
    stream._duplexState |= DESTROYING
  }

  stream._duplexState &= WRITE_NOT_ACTIVE
  this.update()
}

function afterDestroy (err) {
  const stream = this.stream

  if (!err && this.error !== STREAM_DESTROYED) err = this.error
  if (err) stream.emit('error', err)
  stream._duplexState |= DESTROYED
  stream.emit('close')

  const rs = stream._readableState
  const ws = stream._writableState

  if (rs !== null && rs.pipeline !== null) rs.pipeline.done(stream, err)
  if (ws !== null && ws.pipeline !== null) ws.pipeline.done(stream, err)
}

function afterWrite (err) {
  const stream = this.stream

  if (err) stream.destroy(err)
  stream._duplexState &= WRITE_NOT_ACTIVE

  if ((stream._duplexState & WRITE_DRAIN_STATUS) === WRITE_UNDRAINED) {
    stream._duplexState &= WRITE_DRAINED
    if ((stream._duplexState & WRITE_EMIT_DRAIN) === WRITE_EMIT_DRAIN) {
      stream.emit('drain')
    }
  }

  if ((stream._duplexState & WRITE_SYNC) === 0) this.update()
}

function afterRead (err) {
  if (err) this.stream.destroy(err)
  this.stream._duplexState &= READ_NOT_ACTIVE
  if ((this.stream._duplexState & READ_SYNC) === 0) this.update()
}

function updateReadNT () {
  this.stream._duplexState &= READ_NOT_NEXT_TICK
  this.update()
}

function updateWriteNT () {
  this.stream._duplexState &= WRITE_NOT_NEXT_TICK
  this.update()
}

function afterOpen (err) {
  const stream = this.stream

  if (err) stream.destroy(err)

  if ((stream._duplexState & DESTROYING) === 0) {
    if ((stream._duplexState & READ_PRIMARY_STATUS) === 0) stream._duplexState |= READ_PRIMARY
    if ((stream._duplexState & WRITE_PRIMARY_STATUS) === 0) stream._duplexState |= WRITE_PRIMARY
    stream.emit('open')
  }

  stream._duplexState &= NOT_ACTIVE

  if (stream._writableState !== null) {
    stream._writableState.update()
  }

  if (stream._readableState !== null) {
    stream._readableState.update()
  }
}

function afterTransform (err, data) {
  if (data !== undefined && data !== null) this.push(data)
  this._writableState.afterWrite(err)
}

class Stream extends EventEmitter {
  constructor (opts) {
    super()

    this._duplexState = 0
    this._readableState = null
    this._writableState = null

    if (opts) {
      if (opts.open) this._open = opts.open
      if (opts.destroy) this._destroy = opts.destroy
      if (opts.predestroy) this._predestroy = opts.predestroy
      if (opts.signal) {
        opts.signal.addEventListener('abort', abort.bind(this))
      }
    }
  }

  _open (cb) {
    cb(null)
  }

  _destroy (cb) {
    cb(null)
  }

  _predestroy () {
    // does nothing
  }

  get readable () {
    return this._readableState !== null ? true : undefined
  }

  get writable () {
    return this._writableState !== null ? true : undefined
  }

  get destroyed () {
    return (this._duplexState & DESTROYED) !== 0
  }

  get destroying () {
    return (this._duplexState & DESTROY_STATUS) !== 0
  }

  destroy (err) {
    if ((this._duplexState & DESTROY_STATUS) === 0) {
      if (!err) err = STREAM_DESTROYED
      this._duplexState = (this._duplexState | DESTROYING) & NON_PRIMARY

      if (this._readableState !== null) this._readableState.error = err
      if (this._writableState !== null) this._writableState.error = err

      this._duplexState |= PREDESTROYING
      this._predestroy()
      this._duplexState &= NOT_PREDESTROYING

      if (this._readableState !== null) this._readableState.updateNextTick()
      if (this._writableState !== null) this._writableState.updateNextTick()
    }
  }

  on (name, fn) {
    if (this._readableState !== null) {
      if (name === 'data') {
        this._duplexState |= (READ_EMIT_DATA | READ_RESUMED)
        this._readableState.updateNextTick()
      }
      if (name === 'readable') {
        this._duplexState |= READ_EMIT_READABLE
        this._readableState.updateNextTick()
      }
    }

    if (this._writableState !== null) {
      if (name === 'drain') {
        this._duplexState |= WRITE_EMIT_DRAIN
        this._writableState.updateNextTick()
      }
    }

    return super.on(name, fn)
  }
}

class Readable extends Stream {
  constructor (opts) {
    super(opts)

    this._duplexState |= OPENING | WRITE_DONE
    this._readableState = new ReadableState(this, opts)

    if (opts) {
      if (opts.read) this._read = opts.read
      if (opts.eagerOpen) this.resume().pause()
    }
  }

  _read (cb) {
    cb(null)
  }

  pipe (dest, cb) {
    this._readableState.pipe(dest, cb)
    this._readableState.updateNextTick()
    return dest
  }

  read () {
    this._readableState.updateNextTick()
    return this._readableState.read()
  }

  push (data) {
    this._readableState.updateNextTick()
    return this._readableState.push(data)
  }

  unshift (data) {
    this._readableState.updateNextTick()
    return this._readableState.unshift(data)
  }

  resume () {
    this._duplexState |= READ_RESUMED
    this._readableState.updateNextTick()
    return this
  }

  pause () {
    this._duplexState &= READ_PAUSED
    return this
  }

  static _fromAsyncIterator (ite, opts) {
    let destroy

    const rs = new Readable({
      ...opts,
      read (cb) {
        ite.next().then(push).then(cb.bind(null, null)).catch(cb)
      },
      predestroy () {
        destroy = ite.return()
      },
      destroy (cb) {
        if (!destroy) return cb(null)
        destroy.then(cb.bind(null, null)).catch(cb)
      }
    })

    return rs

    function push (data) {
      if (data.done) rs.push(null)
      else rs.push(data.value)
    }
  }

  static from (data, opts) {
    if (isReadStreamx(data)) return data
    if (data[asyncIterator]) return this._fromAsyncIterator(data[asyncIterator](), opts)
    if (!Array.isArray(data)) data = data === undefined ? [] : [data]

    let i = 0
    return new Readable({
      ...opts,
      read (cb) {
        this.push(i === data.length ? null : data[i++])
        cb(null)
      }
    })
  }

  static isBackpressured (rs) {
    return (rs._duplexState & READ_BACKPRESSURE_STATUS) !== 0 || rs._readableState.buffered >= rs._readableState.highWaterMark
  }

  static isPaused (rs) {
    return (rs._duplexState & READ_RESUMED) === 0
  }

  [asyncIterator] () {
    const stream = this

    let error = null
    let promiseResolve = null
    let promiseReject = null

    this.on('error', (err) => { error = err })
    this.on('readable', onreadable)
    this.on('close', onclose)

    return {
      [asyncIterator] () {
        return this
      },
      next () {
        return new Promise(function (resolve, reject) {
          promiseResolve = resolve
          promiseReject = reject
          const data = stream.read()
          if (data !== null) ondata(data)
          else if ((stream._duplexState & DESTROYED) !== 0) ondata(null)
        })
      },
      return () {
        return destroy(null)
      },
      throw (err) {
        return destroy(err)
      }
    }

    function onreadable () {
      if (promiseResolve !== null) ondata(stream.read())
    }

    function onclose () {
      if (promiseResolve !== null) ondata(null)
    }

    function ondata (data) {
      if (promiseReject === null) return
      if (error) promiseReject(error)
      else if (data === null && (stream._duplexState & READ_DONE) === 0) promiseReject(STREAM_DESTROYED)
      else promiseResolve({ value: data, done: data === null })
      promiseReject = promiseResolve = null
    }

    function destroy (err) {
      stream.destroy(err)
      return new Promise((resolve, reject) => {
        if (stream._duplexState & DESTROYED) return resolve({ value: undefined, done: true })
        stream.once('close', function () {
          if (err) reject(err)
          else resolve({ value: undefined, done: true })
        })
      })
    }
  }
}

class Writable extends Stream {
  constructor (opts) {
    super(opts)

    this._duplexState |= OPENING | READ_DONE
    this._writableState = new WritableState(this, opts)

    if (opts) {
      if (opts.writev) this._writev = opts.writev
      if (opts.write) this._write = opts.write
      if (opts.final) this._final = opts.final
    }
  }

  _writev (batch, cb) {
    cb(null)
  }

  _write (data, cb) {
    this._writableState.autoBatch(data, cb)
  }

  _final (cb) {
    cb(null)
  }

  static isBackpressured (ws) {
    return (ws._duplexState & WRITE_BACKPRESSURE_STATUS) !== 0
  }

  write (data) {
    this._writableState.updateNextTick()
    return this._writableState.push(data)
  }

  end (data) {
    this._writableState.updateNextTick()
    this._writableState.end(data)
    return this
  }
}

class Duplex extends Readable { // and Writable
  constructor (opts) {
    super(opts)

    this._duplexState = OPENING
    this._writableState = new WritableState(this, opts)

    if (opts) {
      if (opts.writev) this._writev = opts.writev
      if (opts.write) this._write = opts.write
      if (opts.final) this._final = opts.final
    }
  }

  _writev (batch, cb) {
    cb(null)
  }

  _write (data, cb) {
    this._writableState.autoBatch(data, cb)
  }

  _final (cb) {
    cb(null)
  }

  write (data) {
    this._writableState.updateNextTick()
    return this._writableState.push(data)
  }

  end (data) {
    this._writableState.updateNextTick()
    this._writableState.end(data)
    return this
  }
}

class Transform extends Duplex {
  constructor (opts) {
    super(opts)
    this._transformState = new TransformState(this)

    if (opts) {
      if (opts.transform) this._transform = opts.transform
      if (opts.flush) this._flush = opts.flush
    }
  }

  _write (data, cb) {
    if (this._readableState.buffered >= this._readableState.highWaterMark) {
      this._transformState.data = data
    } else {
      this._transform(data, this._transformState.afterTransform)
    }
  }

  _read (cb) {
    if (this._transformState.data !== null) {
      const data = this._transformState.data
      this._transformState.data = null
      cb(null)
      this._transform(data, this._transformState.afterTransform)
    } else {
      cb(null)
    }
  }

  _transform (data, cb) {
    cb(null, data)
  }

  _flush (cb) {
    cb(null)
  }

  _final (cb) {
    this._transformState.afterFinal = cb
    this._flush(transformAfterFlush.bind(this))
  }
}

class PassThrough extends Transform {}

function transformAfterFlush (err, data) {
  const cb = this._transformState.afterFinal
  if (err) return cb(err)
  if (data !== null && data !== undefined) this.push(data)
  this.push(null)
  cb(null)
}

function pipelinePromise (...streams) {
  return new Promise((resolve, reject) => {
    return pipeline(...streams, (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

function pipeline (stream, ...streams) {
  const all = Array.isArray(stream) ? [...stream, ...streams] : [stream, ...streams]
  const done = (all.length && typeof all[all.length - 1] === 'function') ? all.pop() : null

  if (all.length < 2) throw new Error('Pipeline requires at least 2 streams')

  let src = all[0]
  let dest = null
  let error = null

  for (let i = 1; i < all.length; i++) {
    dest = all[i]

    if (isStreamx(src)) {
      src.pipe(dest, onerror)
    } else {
      errorHandle(src, true, i > 1, onerror)
      src.pipe(dest)
    }

    src = dest
  }

  if (done) {
    let fin = false

    dest.on('finish', () => { fin = true })
    dest.on('error', err => { error = error || err })
    dest.on('close', () => done(error || (fin ? null : PREMATURE_CLOSE)))
  }

  return dest

  function errorHandle (s, rd, wr, onerror) {
    s.on('error', onerror)
    s.on('close', onclose)

    function onclose () {
      if (rd && s._readableState && !s._readableState.ended) return onerror(PREMATURE_CLOSE)
      if (wr && s._writableState && !s._writableState.ended) return onerror(PREMATURE_CLOSE)
    }
  }

  function onerror (err) {
    if (!err || error) return
    error = err

    for (const s of all) {
      s.destroy(err)
    }
  }
}

function isStream (stream) {
  return !!stream._readableState || !!stream._writableState
}

function isStreamx (stream) {
  return typeof stream._duplexState === 'number' && isStream(stream)
}

function getStreamError (stream) {
  return (stream._readableState && stream._readableState.error) || (stream._writableState && stream._writableState.error)
}

function isReadStreamx (stream) {
  return isStreamx(stream) && stream.readable
}

function isTypedArray (data) {
  return typeof data === 'object' && data !== null && typeof data.byteLength === 'number'
}

function defaultByteLength (data) {
  return isTypedArray(data) ? data.byteLength : 1024
}

function noop () {}

function abort () {
  this.destroy(new Error('Stream aborted.'))
}

module.exports = {
  pipeline,
  pipelinePromise,
  isStream,
  isStreamx,
  getStreamError,
  Stream,
  Writable,
  Readable,
  Duplex,
  Transform,
  // Export PassThrough for compatibility with Node.js core's stream module
  PassThrough
}


/***/ }),

/***/ 2553:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



/*<replacement>*/

var Buffer = (__webpack_require__(9509).Buffer);
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.s = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}

/***/ }),

/***/ 5017:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/*                                                                              
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in      
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE.
*/

var base32 = __webpack_require__(883);

exports.encode = base32.encode;
exports.decode = base32.decode;


/***/ }),

/***/ 883:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(8764)["Buffer"];
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/


var charTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
var byteTable = [
    0xff, 0xff, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
    0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
    0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
    0x17, 0x18, 0x19, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
    0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
    0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
    0x17, 0x18, 0x19, 0xff, 0xff, 0xff, 0xff, 0xff
];

function quintetCount(buff) {
    var quintets = Math.floor(buff.length / 5);
    return buff.length % 5 === 0 ? quintets: quintets + 1;
}

exports.encode = function(plain) {
    if(!Buffer.isBuffer(plain)){
    	plain = new Buffer(plain);
    }
    var i = 0;
    var j = 0;
    var shiftIndex = 0;
    var digit = 0;
    var encoded = new Buffer(quintetCount(plain) * 8);

    /* byte by byte isn't as pretty as quintet by quintet but tests a bit
        faster. will have to revisit. */
    while(i < plain.length) {
        var current = plain[i];

        if(shiftIndex > 3) {
            digit = current & (0xff >> shiftIndex);
            shiftIndex = (shiftIndex + 5) % 8;
            digit = (digit << shiftIndex) | ((i + 1 < plain.length) ?
                plain[i + 1] : 0) >> (8 - shiftIndex);
            i++;
        } else {
            digit = (current >> (8 - (shiftIndex + 5))) & 0x1f;
            shiftIndex = (shiftIndex + 5) % 8;
            if(shiftIndex === 0) i++;
        }

        encoded[j] = charTable.charCodeAt(digit);
        j++;
    }

    for(i = j; i < encoded.length; i++) {
        encoded[i] = 0x3d; //'='.charCodeAt(0)
    }

    return encoded;
};

exports.decode = function(encoded) {
    var shiftIndex = 0;
    var plainDigit = 0;
    var plainChar;
    var plainPos = 0;
    if(!Buffer.isBuffer(encoded)){
    	encoded = new Buffer(encoded);
    }
    var decoded = new Buffer(Math.ceil(encoded.length * 5 / 8));

    /* byte by byte isn't as pretty as octet by octet but tests a bit
        faster. will have to revisit. */
    for(var i = 0; i < encoded.length; i++) {
    	if(encoded[i] === 0x3d){ //'='
    		break;
    	}

        var encodedByte = encoded[i] - 0x30;

        if(encodedByte < byteTable.length) {
            plainDigit = byteTable[encodedByte];

            if(shiftIndex <= 3) {
                shiftIndex = (shiftIndex + 5) % 8;

                if(shiftIndex === 0) {
                    plainChar |= plainDigit;
                    decoded[plainPos] = plainChar;
                    plainPos++;
                    plainChar = 0;
                } else {
                    plainChar |= 0xff & (plainDigit << (8 - shiftIndex));
                }
            } else {
                shiftIndex = (shiftIndex + 5) % 8;
                plainChar |= 0xff & (plainDigit >>> shiftIndex);
                decoded[plainPos] = plainChar;
                plainPos++;

                plainChar = 0xff & (plainDigit << (8 - shiftIndex));
            }
        } else {
        	throw new Error('Invalid input - it is not base32 encoded string');
        }
    }

    return decoded.slice(0, plainPos);
};


/***/ }),

/***/ 1463:
/***/ ((module) => {

const maxTick = 65535
const resolution = 10
const timeDiff = 1000 / resolution
function getTick (start) {
  return (+Date.now() - start) / timeDiff & 65535
}

module.exports = function (seconds) {
  const start = +Date.now()

  const size = resolution * (seconds || 5)
  const buffer = [0]
  let pointer = 1
  let last = (getTick(start) - 1) & maxTick

  return function (delta) {
    const tick = getTick(start)
    let dist = (tick - last) & maxTick
    if (dist > size) dist = size
    last = tick

    while (dist--) {
      if (pointer === size) pointer = 0
      buffer[pointer] = buffer[pointer === 0 ? size - 1 : pointer - 1]
      pointer++
    }

    if (delta) buffer[pointer - 1] += delta

    const top = buffer[pointer - 1]
    const btm = buffer.length < size ? 0 : buffer[pointer === size ? 0 : pointer]

    return buffer.length < resolution ? top : (top - btm) * resolution / buffer.length
  }
}


/***/ }),

/***/ 8687:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(8764)["Buffer"];
/*! torrent-piece. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */
const BLOCK_LENGTH = 1 << 14

class Piece {
  constructor (length) {
    this.length = length
    this.missing = length
    this.sources = null

    this._chunks = Math.ceil(length / BLOCK_LENGTH)
    this._remainder = (length % BLOCK_LENGTH) || BLOCK_LENGTH
    this._buffered = 0
    this._buffer = null
    this._cancellations = null
    this._reservations = 0
    this._flushed = false
  }

  chunkLength (i) {
    return i === this._chunks - 1 ? this._remainder : BLOCK_LENGTH
  }

  chunkLengthRemaining (i) {
    return this.length - (i * BLOCK_LENGTH)
  }

  chunkOffset (i) {
    return i * BLOCK_LENGTH
  }

  reserve () {
    if (!this.init()) return -1
    if (this._cancellations.length) return this._cancellations.pop()
    if (this._reservations < this._chunks) return this._reservations++
    return -1
  }

  reserveRemaining () {
    if (!this.init()) return -1
    if (this._cancellations.length || this._reservations < this._chunks) {
      let min = this._reservations
      while (this._cancellations.length) {
        min = Math.min(min, this._cancellations.pop())
      }
      this._reservations = this._chunks
      return min
    }
    return -1
  }

  cancel (i) {
    if (!this.init()) return
    this._cancellations.push(i)
  }

  cancelRemaining (i) {
    if (!this.init()) return
    this._reservations = i
  }

  get (i) {
    if (!this.init()) return null
    return this._buffer[i]
  }

  set (i, data, source) {
    if (!this.init()) return false
    const len = data.length
    const blocks = Math.ceil(len / BLOCK_LENGTH)
    for (let j = 0; j < blocks; j++) {
      if (!this._buffer[i + j]) {
        const offset = j * BLOCK_LENGTH
        const splitData = data.slice(offset, offset + BLOCK_LENGTH)
        this._buffered++
        this._buffer[i + j] = splitData
        this.missing -= splitData.length
        if (!this.sources.includes(source)) {
          this.sources.push(source)
        }
      }
    }
    return this._buffered === this._chunks
  }

  flush () {
    if (!this._buffer || this._chunks !== this._buffered) return null
    const buffer = Buffer.concat(this._buffer, this.length)
    this._buffer = null
    this._cancellations = null
    this.sources = null
    this._flushed = true
    return buffer
  }

  init () {
    if (this._flushed) return false
    if (this._buffer) return true
    this._buffer = new Array(this._chunks)
    this._cancellations = []
    this.sources = []
    return true
  }
}

Object.defineProperty(Piece, 'BLOCK_LENGTH', { value: BLOCK_LENGTH })

module.exports = Piece


/***/ }),

/***/ 6581:
/***/ ((module) => {

module.exports = remove

function remove (arr, i) {
  if (i >= arr.length || i < 0) return
  var last = arr.pop()
  if (i < arr.length) {
    var tmp = arr[i]
    arr[i] = last
    return tmp
  }
  return last
}


/***/ }),

/***/ 4927:
/***/ ((module) => {


/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!globalThis.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = globalThis.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}


/***/ }),

/***/ 2479:
/***/ ((module) => {

// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}


/***/ }),

/***/ 6475:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 2203:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 3423:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 1494:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 5381:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 8838:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 5517:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 9354:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 8411:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 1857:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 159:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 859:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 2911:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 970:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 1982:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 1156:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 2361:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 4616:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 3719:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 1018:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 2067:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 8302:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 3552:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 5843:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 3287:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Peer),
/* harmony export */   "enableSecure": () => (/* binding */ enableSecure)
/* harmony export */ });
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(7187);
/* harmony import */ var streamx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1237);
/* harmony import */ var unordered_array_remove__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6581);
/* harmony import */ var debug__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(1227);
/* harmony import */ var bittorrent_protocol__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(814);






const CONNECT_TIMEOUT_TCP = 5_000
const CONNECT_TIMEOUT_UTP = 5_000
const CONNECT_TIMEOUT_WEBRTC = 25_000
const HANDSHAKE_TIMEOUT = 25_000

// Types of peers
const TYPE_TCP_INCOMING = 'tcpIncoming'
const TYPE_TCP_OUTGOING = 'tcpOutgoing'
const TYPE_UTP_INCOMING = 'utpIncoming'
const TYPE_UTP_OUTGOING = 'utpOutgoing'
const TYPE_WEBRTC = 'webrtc'
const TYPE_WEBSEED = 'webSeed'

// Source used to obtain the peer
const SOURCE_MANUAL = 'manual'
const SOURCE_TRACKER = 'tracker'
const SOURCE_DHT = 'dht'
const SOURCE_LSD = 'lsd'
const SOURCE_UT_PEX = 'ut_pex'

const debug = debug__WEBPACK_IMPORTED_MODULE_3__('webtorrent:peer')

let secure = false

const enableSecure = () => {
  secure = true
}

/**
 * Peer. Represents a peer in the torrent swarm.
 *
 * @param {string} id "ip:port" string, peer id (for WebRTC peers), or url (for Web Seeds)
 * @param {string} type the type of the peer
 */
class Peer extends events__WEBPACK_IMPORTED_MODULE_0__ {
  constructor (id, type) {
    super()

    this.id = id
    this.type = type

    debug('new %s Peer %s', type, id)

    this.addr = null
    this.conn = null
    this.swarm = null
    this.wire = null
    this.source = null

    this.connected = false
    this.destroyed = false
    this.timeout = null // handshake timeout
    this.retries = 0 // outgoing TCP connection retry count

    this.sentPe1 = false
    this.sentPe2 = false
    this.sentPe3 = false
    this.sentPe4 = false
    this.sentHandshake = false
  }

  /**
   * Called once the peer is connected (i.e. fired 'connect' event)
   * @param {Socket} conn
   */
  onConnect () {
    if (this.destroyed) return
    this.connected = true

    debug('Peer %s connected', this.id)

    clearTimeout(this.connectTimeout)

    const conn = this.conn
    conn.once('end', () => {
      this.destroy()
    })
    conn.once('close', () => {
      this.destroy()
    })
    conn.once('finish', () => {
      this.destroy()
    })
    conn.once('error', err => {
      this.destroy(err)
    })

    const wire = this.wire = new bittorrent_protocol__WEBPACK_IMPORTED_MODULE_4__/* ["default"] */ .Z(this.type, this.retries, secure)

    wire.once('end', () => {
      this.destroy()
    })
    wire.once('close', () => {
      this.destroy()
    })
    wire.once('finish', () => {
      this.destroy()
    })
    wire.once('error', err => {
      this.destroy(err)
    })

    wire.once('pe1', () => {
      this.onPe1()
    })
    wire.once('pe2', () => {
      this.onPe2()
    })
    wire.once('pe3', () => {
      this.onPe3()
    })
    wire.once('pe4', () => {
      this.onPe4()
    })
    wire.once('handshake', (infoHash, peerId) => {
      this.onHandshake(infoHash, peerId)
    })
    this.startHandshakeTimeout()

    this.setThrottlePipes()

    if (this.swarm) {
      if (this.type === 'tcpOutgoing') {
        if (secure && this.retries === 0 && !this.sentPe1) this.sendPe1()
        else if (!this.sentHandshake) this.handshake()
      } else if (this.type !== 'tcpIncoming' && !this.sentHandshake) this.handshake()
    }
  }

  sendPe1 () {
    this.wire.sendPe1()
    this.sentPe1 = true
  }

  onPe1 () {
    this.sendPe2()
  }

  sendPe2 () {
    this.wire.sendPe2()
    this.sentPe2 = true
  }

  onPe2 () {
    this.sendPe3()
  }

  sendPe3 () {
    this.wire.sendPe3(this.swarm.infoHash)
    this.sentPe3 = true
  }

  onPe3 (infoHashHash) {
    if (this.swarm) {
      if (this.swarm.infoHashHash !== infoHashHash) {
        this.destroy(new Error('unexpected crypto handshake info hash for this swarm')) // KEEP [CG]
      }
      this.sendPe4()
    }
  }

  sendPe4 () {
    this.wire.sendPe4(this.swarm.infoHash)
    this.sentPe4 = true
  }

  onPe4 () {
    if (!this.sentHandshake) this.handshake()
  }

  clearPipes () {
    this.conn.unpipe()
    this.wire.unpipe()
  }

  setThrottlePipes () {
    const self = this
    ;(0,streamx__WEBPACK_IMPORTED_MODULE_1__.pipeline)(
      this.conn,
      this.throttleGroups.down.throttle(),
      new streamx__WEBPACK_IMPORTED_MODULE_1__.Transform({
        transform (chunk, callback) {
          self.emit('download', chunk.length)
          if (self.destroyed) return
          callback(null, chunk)
        }
      }),
      this.wire,
      this.throttleGroups.up.throttle(),
      new streamx__WEBPACK_IMPORTED_MODULE_1__.Transform({
        transform (chunk, callback) {
          self.emit('upload', chunk.length)
          if (self.destroyed) return
          callback(null, chunk)
        }
      }),
      this.conn
    )
  }

  /**
   * Called when handshake is received from remote peer.
   * @param {string} infoHash
   * @param {string} peerId
   */
  onHandshake (infoHash, peerId) {
    if (!this.swarm) return // `this.swarm` not set yet, so do nothing
    if (this.destroyed) return

    if (this.swarm.destroyed) {
      return this.destroy(new Error('swarm already destroyed'))
    }
    if (infoHash !== this.swarm.infoHash) {
      return this.destroy(new Error('unexpected handshake info hash for this swarm')) // KEEP [CG]
    }
    if (peerId === this.swarm.peerId) {
      return this.destroy(new Error('refusing to connect to ourselves'))
    }

    debug('Peer %s got handshake %s', this.id, infoHash)

    clearTimeout(this.handshakeTimeout)

    this.retries = 0

    let addr = this.addr
    if (!addr && this.conn.remoteAddress && this.conn.remotePort) {
      addr = `${this.conn.remoteAddress}:${this.conn.remotePort}`
    }
    this.swarm._onWire(this.wire, addr)

    // swarm could be destroyed in user's 'wire' event handler
    if (!this.swarm || this.swarm.destroyed) return

    if (!this.sentHandshake) this.handshake()
  }

  handshake () {
    const opts = {
      dht: this.swarm.private ? false : !!this.swarm.client.dht,
      fast: true
    }
    this.wire.handshake(this.swarm.infoHash, this.swarm.client.peerId, opts)
    this.sentHandshake = true
  }

  startConnectTimeout () {
    clearTimeout(this.connectTimeout)

    const connectTimeoutValues = {
      webrtc: CONNECT_TIMEOUT_WEBRTC,
      tcpOutgoing: CONNECT_TIMEOUT_TCP,
      utpOutgoing: CONNECT_TIMEOUT_UTP
    }

    this.connectTimeout = setTimeout(() => {
      this.destroy(new Error('connect timeout'))
    }, connectTimeoutValues[this.type])
    if (this.connectTimeout.unref) this.connectTimeout.unref()
  }

  startHandshakeTimeout () {
    clearTimeout(this.handshakeTimeout)
    this.handshakeTimeout = setTimeout(() => {
      this.destroy(new Error('handshake timeout'))
    }, HANDSHAKE_TIMEOUT)
    if (this.handshakeTimeout.unref) this.handshakeTimeout.unref()
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true
    this.connected = false

    debug('destroy %s %s (error: %s)', this.type, this.id, err && (err.message || err))

    clearTimeout(this.connectTimeout)
    clearTimeout(this.handshakeTimeout)

    const swarm = this.swarm
    const conn = this.conn
    const wire = this.wire

    this.swarm = null
    this.conn = null
    this.wire = null

    if (swarm && wire) {
      unordered_array_remove__WEBPACK_IMPORTED_MODULE_2__(swarm.wires, swarm.wires.indexOf(wire))
    }
    if (conn) {
      conn.on('error', () => {})
      conn.destroy()
    }
    if (wire) wire.destroy()
    if (swarm) swarm.removePeer(this.id)
  }
}

Peer.TYPE_TCP_INCOMING = TYPE_TCP_INCOMING
Peer.TYPE_TCP_OUTGOING = TYPE_TCP_OUTGOING
Peer.TYPE_UTP_INCOMING = TYPE_UTP_INCOMING
Peer.TYPE_UTP_OUTGOING = TYPE_UTP_OUTGOING
Peer.TYPE_WEBRTC = TYPE_WEBRTC
Peer.TYPE_WEBSEED = TYPE_WEBSEED

Peer.SOURCE_MANUAL = SOURCE_MANUAL
Peer.SOURCE_TRACKER = SOURCE_TRACKER
Peer.SOURCE_DHT = SOURCE_DHT
Peer.SOURCE_LSD = SOURCE_LSD
Peer.SOURCE_UT_PEX = SOURCE_UT_PEX

/**
 * WebRTC peer connections start out connected, because WebRTC peers require an
 * "introduction" (i.e. WebRTC signaling), and there's no equivalent to an IP address
 * that lets you refer to a WebRTC endpoint.
 */
Peer.createWebRTCPeer = (conn, swarm, throttleGroups) => {
  const peer = new Peer(conn.id, 'webrtc')
  peer.conn = conn
  peer.swarm = swarm
  peer.throttleGroups = throttleGroups

  if (peer.conn.connected) {
    peer.onConnect()
  } else {
    const cleanup = () => {
      peer.conn.removeListener('connect', onConnect)
      peer.conn.removeListener('error', onError)
    }
    const onConnect = () => {
      cleanup()
      peer.onConnect()
    }
    const onError = err => {
      cleanup()
      peer.destroy(err)
    }
    peer.conn.once('connect', onConnect)
    peer.conn.once('error', onError)
    peer.startConnectTimeout()
  }

  return peer
}

/**
 * Incoming TCP peers start out connected, because the remote peer connected to the
 * listening port of the TCP server. Until the remote peer sends a handshake, we don't
 * know what swarm the connection is intended for.
 */
Peer.createTCPIncomingPeer = (conn, throttleGroups) => {
  return Peer._createIncomingPeer(conn, TYPE_TCP_INCOMING, throttleGroups)
}

/**
 * Incoming uTP peers start out connected, because the remote peer connected to the
 * listening port of the uTP server. Until the remote peer sends a handshake, we don't
 * know what swarm the connection is intended for.
 */
Peer.createUTPIncomingPeer = (conn, throttleGroups) => {
  return Peer._createIncomingPeer(conn, TYPE_UTP_INCOMING, throttleGroups)
}

/**
 * Outgoing TCP peers start out with just an IP address. At some point (when there is an
 * available connection), the client can attempt to connect to the address.
 */
Peer.createTCPOutgoingPeer = (addr, swarm, throttleGroups) => {
  return Peer._createOutgoingPeer(addr, swarm, TYPE_TCP_OUTGOING, throttleGroups)
}

/**
 * Outgoing uTP peers start out with just an IP address. At some point (when there is an
 * available connection), the client can attempt to connect to the address.
 */
Peer.createUTPOutgoingPeer = (addr, swarm, throttleGroups) => {
  return Peer._createOutgoingPeer(addr, swarm, TYPE_UTP_OUTGOING, throttleGroups)
}

Peer._createIncomingPeer = (conn, type, throttleGroups) => {
  const addr = `${conn.remoteAddress}:${conn.remotePort}`
  const peer = new Peer(addr, type)
  peer.conn = conn
  peer.addr = addr
  peer.throttleGroups = throttleGroups

  peer.onConnect()

  return peer
}

Peer._createOutgoingPeer = (addr, swarm, type, throttleGroups) => {
  const peer = new Peer(addr, type)
  peer.addr = addr
  peer.swarm = swarm
  peer.throttleGroups = throttleGroups

  return peer
}

/**
 * Peer that represents a Web Seed (BEP17 / BEP19).
 */

Peer.createWebSeedPeer = (conn, id, swarm, throttleGroups) => {
  const peer = new Peer(id, TYPE_WEBSEED)

  peer.swarm = swarm
  peer.conn = conn
  peer.throttleGroups = throttleGroups

  peer.onConnect()

  return peer
}


/***/ }),

/***/ 502:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Z": () => (/* binding */ bencode)
});

// EXTERNAL MODULE: ./node_modules/uint8-util/browser.js + 2 modules
var browser = __webpack_require__(5194);
;// CONCATENATED MODULE: ./node_modules/bencode/lib/util.js
function digitCount (value) {
  // Add a digit for negative numbers, as the sign will be prefixed
  const sign = value < 0 ? 1 : 0
  // Guard against negative numbers & zero going into log10(),
  // as that would return -Infinity
  value = Math.abs(Number(value || 1))
  return Math.floor(Math.log10(value)) + 1 + sign
}

function getType (value) {
  if (ArrayBuffer.isView(value)) return 'arraybufferview'
  if (Array.isArray(value)) return 'array'
  if (value instanceof Number) return 'number'
  if (value instanceof Boolean) return 'boolean'
  if (value instanceof Set) return 'set'
  if (value instanceof Map) return 'map'
  if (value instanceof String) return 'string'
  if (value instanceof ArrayBuffer) return 'arraybuffer'
  return typeof value
}

;// CONCATENATED MODULE: ./node_modules/bencode/lib/encode.js



/**
 * Encodes data in bencode.
 *
 * @param  {Uint8Array|Array|String|Object|Number|Boolean} data
 * @return {Uint8Array}
 */
function encode (data, buffer, offset) {
  const buffers = []
  let result = null

  encode._encode(buffers, data)
  result = (0,browser/* concat */.zo)(buffers)
  encode.bytes = result.length

  if (ArrayBuffer.isView(buffer)) {
    buffer.set(result, offset)
    return buffer
  }

  return result
}

encode.bytes = -1
encode._floatConversionDetected = false

encode._encode = function (buffers, data) {
  if (data == null) { return }

  switch (getType(data)) {
    case 'object': encode.dict(buffers, data); break
    case 'map': encode.dictMap(buffers, data); break
    case 'array': encode.list(buffers, data); break
    case 'set': encode.listSet(buffers, data); break
    case 'string': encode.string(buffers, data); break
    case 'number': encode.number(buffers, data); break
    case 'boolean': encode.number(buffers, data); break
    case 'arraybufferview': encode.buffer(buffers, new Uint8Array(data.buffer, data.byteOffset, data.byteLength)); break
    case 'arraybuffer': encode.buffer(buffers, new Uint8Array(data)); break
  }
}

const buffE = new Uint8Array([0x65])
const buffD = new Uint8Array([0x64])
const buffL = new Uint8Array([0x6C])

encode.buffer = function (buffers, data) {
  buffers.push((0,browser/* text2arr */.gR)(data.length + ':'), data)
}

encode.string = function (buffers, data) {
  buffers.push((0,browser/* text2arr */.gR)((0,browser/* text2arr */.gR)(data).byteLength + ':' + data))
}

encode.number = function (buffers, data) {
  const maxLo = 0x80000000
  const hi = (data / maxLo) << 0
  const lo = (data % maxLo) << 0
  const val = hi * maxLo + lo

  buffers.push((0,browser/* text2arr */.gR)('i' + val + 'e'))

  if (val !== data && !encode._floatConversionDetected) {
    encode._floatConversionDetected = true
    console.warn(
      'WARNING: Possible data corruption detected with value "' + data + '":',
      'Bencoding only defines support for integers, value was converted to "' + val + '"'
    )
    console.trace()
  }
}

encode.dict = function (buffers, data) {
  buffers.push(buffD)

  let j = 0
  let k
  // fix for issue #13 - sorted dicts
  const keys = Object.keys(data).sort()
  const kl = keys.length

  for (; j < kl; j++) {
    k = keys[j]
    if (data[k] == null) continue
    encode.string(buffers, k)
    encode._encode(buffers, data[k])
  }

  buffers.push(buffE)
}

encode.dictMap = function (buffers, data) {
  buffers.push(buffD)

  const keys = Array.from(data.keys()).sort()

  for (const key of keys) {
    if (data.get(key) == null) continue
    ArrayBuffer.isView(key)
      ? encode._encode(buffers, key)
      : encode.string(buffers, String(key))
    encode._encode(buffers, data.get(key))
  }

  buffers.push(buffE)
}

encode.list = function (buffers, data) {
  let i = 0
  const c = data.length
  buffers.push(buffL)

  for (; i < c; i++) {
    if (data[i] == null) continue
    encode._encode(buffers, data[i])
  }

  buffers.push(buffE)
}

encode.listSet = function (buffers, data) {
  buffers.push(buffL)

  for (const item of data) {
    if (item == null) continue
    encode._encode(buffers, item)
  }

  buffers.push(buffE)
}

/* harmony default export */ const lib_encode = (encode);

;// CONCATENATED MODULE: ./node_modules/bencode/lib/decode.js


const INTEGER_START = 0x69 // 'i'
const STRING_DELIM = 0x3A // ':'
const DICTIONARY_START = 0x64 // 'd'
const LIST_START = 0x6C // 'l'
const END_OF_TYPE = 0x65 // 'e'

/**
 * replaces parseInt(buffer.toString('ascii', start, end)).
 * For strings with less then ~30 charachters, this is actually a lot faster.
 *
 * @param {Uint8Array} data
 * @param {Number} start
 * @param {Number} end
 * @return {Number} calculated number
 */
function getIntFromBuffer (buffer, start, end) {
  let sum = 0
  let sign = 1

  for (let i = start; i < end; i++) {
    const num = buffer[i]

    if (num < 58 && num >= 48) {
      sum = sum * 10 + (num - 48)
      continue
    }

    if (i === start && num === 43) { // +
      continue
    }

    if (i === start && num === 45) { // -
      sign = -1
      continue
    }

    if (num === 46) { // .
      // its a float. break here.
      break
    }

    throw new Error('not a number: buffer[' + i + '] = ' + num)
  }

  return sum * sign
}

/**
 * Decodes bencoded data.
 *
 * @param  {Uint8Array} data
 * @param  {Number} start (optional)
 * @param  {Number} end (optional)
 * @param  {String} encoding (optional)
 * @return {Object|Array|Uint8Array|String|Number}
 */
function decode (data, start, end, encoding) {
  if (data == null || data.length === 0) {
    return null
  }

  if (typeof start !== 'number' && encoding == null) {
    encoding = start
    start = undefined
  }

  if (typeof end !== 'number' && encoding == null) {
    encoding = end
    end = undefined
  }

  decode.position = 0
  decode.encoding = encoding || null

  decode.data = !(ArrayBuffer.isView(data))
    ? (0,browser/* text2arr */.gR)(data)
    : new Uint8Array(data.slice(start, end))

  decode.bytes = decode.data.length

  return decode.next()
}

decode.bytes = 0
decode.position = 0
decode.data = null
decode.encoding = null

decode.next = function () {
  switch (decode.data[decode.position]) {
    case DICTIONARY_START:
      return decode.dictionary()
    case LIST_START:
      return decode.list()
    case INTEGER_START:
      return decode.integer()
    default:
      return decode.buffer()
  }
}

decode.find = function (chr) {
  let i = decode.position
  const c = decode.data.length
  const d = decode.data

  while (i < c) {
    if (d[i] === chr) return i
    i++
  }

  throw new Error(
    'Invalid data: Missing delimiter "' +
    String.fromCharCode(chr) + '" [0x' +
    chr.toString(16) + ']'
  )
}

decode.dictionary = function () {
  decode.position++

  const dict = {}

  while (decode.data[decode.position] !== END_OF_TYPE) {
    dict[(0,browser/* arr2text */.vV)(decode.buffer())] = decode.next()
  }

  decode.position++

  return dict
}

decode.list = function () {
  decode.position++

  const lst = []

  while (decode.data[decode.position] !== END_OF_TYPE) {
    lst.push(decode.next())
  }

  decode.position++

  return lst
}

decode.integer = function () {
  const end = decode.find(END_OF_TYPE)
  const number = getIntFromBuffer(decode.data, decode.position + 1, end)

  decode.position += end + 1 - decode.position

  return number
}

decode.buffer = function () {
  let sep = decode.find(STRING_DELIM)
  const length = getIntFromBuffer(decode.data, decode.position, sep)
  const end = ++sep + length

  decode.position = end

  return decode.encoding
    ? (0,browser/* arr2text */.vV)(decode.data.slice(sep, end))
    : decode.data.slice(sep, end)
}

/* harmony default export */ const lib_decode = (decode);

;// CONCATENATED MODULE: ./node_modules/bencode/lib/encoding-length.js



function listLength (list) {
  let length = 1 + 1 // type marker + end-of-type marker

  for (const value of list) {
    length += encodingLength(value)
  }

  return length
}

function mapLength (map) {
  let length = 1 + 1 // type marker + end-of-type marker

  for (const [key, value] of map) {
    const keyLength = (0,browser/* text2arr */.gR)(key).byteLength
    length += digitCount(keyLength) + 1 + keyLength
    length += encodingLength(value)
  }

  return length
}

function objectLength (value) {
  let length = 1 + 1 // type marker + end-of-type marker
  const keys = Object.keys(value)

  for (let i = 0; i < keys.length; i++) {
    const keyLength = (0,browser/* text2arr */.gR)(keys[i]).byteLength
    length += digitCount(keyLength) + 1 + keyLength
    length += encodingLength(value[keys[i]])
  }

  return length
}

function stringLength (value) {
  const length = (0,browser/* text2arr */.gR)(value).byteLength
  return digitCount(length) + 1 + length
}

function arrayBufferLength (value) {
  const length = value.byteLength - value.byteOffset
  return digitCount(length) + 1 + length
}

function encodingLength (value) {
  const length = 0

  if (value == null) return length

  const type = getType(value)

  switch (type) {
    case 'arraybufferview': return arrayBufferLength(value)
    case 'string': return stringLength(value)
    case 'array': case 'set': return listLength(value)
    case 'number': return 1 + digitCount(Math.floor(value)) + 1
    case 'bigint': return 1 + value.toString().length + 1
    case 'object': return objectLength(value)
    case 'map': return mapLength(value)
    default:
      throw new TypeError(`Unsupported value of type "${type}"`)
  }
}

/* harmony default export */ const encoding_length = (encodingLength);

;// CONCATENATED MODULE: ./node_modules/bencode/index.js



/**
 * Determines the amount of bytes
 * needed to encode the given value
 * @param  {Object|Array|Uint8Array|String|Number|Boolean} value
 * @return {Number} byteCount
 */
const bencode_encodingLength = encoding_length
/* harmony default export */ const bencode = ({ encode: lib_encode, decode: lib_decode, byteLength: encoding_length, encodingLength: bencode_encodingLength });


/***/ }),

/***/ 8205:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Z": () => (/* binding */ BitField)
/* harmony export */ });
function getByteSize(num) {
    let out = num >> 3;
    if (num % 8 !== 0)
        out++;
    return out;
}
class BitField {
    /**
     *
     *
     * @param data Either a number representing the maximum number of supported bytes, or a Uint8Array.
     * @param opts Options for the bitfield.
     */
    constructor(data = 0, opts) {
        const grow = opts === null || opts === void 0 ? void 0 : opts.grow;
        this.grow = (grow && isFinite(grow) && getByteSize(grow)) || grow || 0;
        this.buffer =
            typeof data === "number" ? new Uint8Array(getByteSize(data)) : data;
    }
    /**
     * Get a particular bit.
     *
     * @param i Bit index to retrieve.
     * @returns A boolean indicating whether the `i`th bit is set.
     */
    get(i) {
        const j = i >> 3;
        return j < this.buffer.length && !!(this.buffer[j] & (128 >> i % 8));
    }
    /**
     * Set a particular bit.
     *
     * Will grow the underlying array if the bit is out of bounds and the `grow` option is set.
     *
     * @param i Bit index to set.
     * @param value Value to set the bit to. Defaults to `true`.
     */
    set(i, value = true) {
        const j = i >> 3;
        if (value) {
            if (this.buffer.length < j + 1) {
                const length = Math.max(j + 1, Math.min(2 * this.buffer.length, this.grow));
                if (length <= this.grow) {
                    const newBuffer = new Uint8Array(length);
                    newBuffer.set(this.buffer);
                    this.buffer = newBuffer;
                }
            }
            // Set
            this.buffer[j] |= 128 >> i % 8;
        }
        else if (j < this.buffer.length) {
            // Clear
            this.buffer[j] &= ~(128 >> i % 8);
        }
    }
    /**
     * Loop through the bits in the bitfield.
     *
     * @param fn Function to be called with the bit value and index.
     * @param start Index of the first bit to look at.
     * @param end Index of the first bit that should no longer be considered.
     */
    forEach(fn, start = 0, end = this.buffer.length * 8) {
        for (let i = start, j = i >> 3, y = 128 >> i % 8, byte = this.buffer[j]; i < end; i++) {
            fn(!!(byte & y), i);
            y = y === 1 ? ((byte = this.buffer[++j]), 128) : y >> 1;
        }
    }
}
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 814:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Z": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var bencode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(502);
/* harmony import */ var bitfield__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(8205);
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5517);
/* harmony import */ var debug__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(1227);
/* harmony import */ var randombytes__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(1798);
/* harmony import */ var rc4__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(7830);
/* harmony import */ var readable_stream__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(8473);
/* harmony import */ var uint8_util__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(5194);
/* harmony import */ var throughput__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(1463);
/* harmony import */ var unordered_array_remove__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(6581);
/*! bittorrent-protocol. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */











const debug = debug__WEBPACK_IMPORTED_MODULE_2__('bittorrent-protocol')

const BITFIELD_GROW = 400000
const KEEP_ALIVE_TIMEOUT = 55000
const ALLOWED_FAST_SET_MAX_LENGTH = 100

const MESSAGE_PROTOCOL = (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .text2arr */ .gR)('\u0013BitTorrent protocol')
const MESSAGE_KEEP_ALIVE = new Uint8Array([0x00, 0x00, 0x00, 0x00])
const MESSAGE_CHOKE = new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x00])
const MESSAGE_UNCHOKE = new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x01])
const MESSAGE_INTERESTED = new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x02])
const MESSAGE_UNINTERESTED = new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x03])

const MESSAGE_RESERVED = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
const MESSAGE_PORT = [0x00, 0x00, 0x00, 0x03, 0x09, 0x00, 0x00]

// BEP6 Fast Extension
const MESSAGE_HAVE_ALL = new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x0E])
const MESSAGE_HAVE_NONE = new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x0F])

const DH_PRIME = 'ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a63a36210000000000090563'
const DH_GENERATOR = 2
const VC = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
const CRYPTO_PROVIDE = new Uint8Array([0x00, 0x00, 0x01, 0x02])
const CRYPTO_SELECT = new Uint8Array([0x00, 0x00, 0x00, 0x02]) // always try to choose RC4 encryption instead of plaintext

function xor (a, b) {
  for (let len = a.length; len--;) a[len] ^= b[len]
  return a
}

class Request {
  constructor (piece, offset, length, callback) {
    this.piece = piece
    this.offset = offset
    this.length = length
    this.callback = callback
  }
}

class HaveAllBitField {
  constructor () {
    this.buffer = new Uint8Array() // dummy
  }

  get (index) {
    return true
  }

  set (index) {}
}

class Wire extends readable_stream__WEBPACK_IMPORTED_MODULE_5__.Duplex {
  constructor (type = null, retries = 0, peEnabled = false) {
    super()

    this._debugId = (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2hex */ .oc)(randombytes__WEBPACK_IMPORTED_MODULE_3__(4))
    this._debug('new wire')

    this.peerId = null // remote peer id (hex string)
    this.peerIdBuffer = null // remote peer id (buffer)
    this.type = type // connection type ('webrtc', 'tcpIncoming', 'tcpOutgoing', 'webSeed')

    this.amChoking = true // are we choking the peer?
    this.amInterested = false // are we interested in the peer?

    this.peerChoking = true // is the peer choking us?
    this.peerInterested = false // is the peer interested in us?

    // The largest torrent that I know of (the Geocities archive) is ~641 GB and has
    // ~41,000 pieces. Therefore, cap bitfield to 10x larger (400,000 bits) to support all
    // possible torrents but prevent malicious peers from growing bitfield to fill memory.
    this.peerPieces = new bitfield__WEBPACK_IMPORTED_MODULE_9__/* ["default"] */ .Z(0, { grow: BITFIELD_GROW })

    this.extensions = {}
    this.peerExtensions = {}

    this.requests = [] // outgoing
    this.peerRequests = [] // incoming

    this.extendedMapping = {} // number -> string, ex: 1 -> 'ut_metadata'
    this.peerExtendedMapping = {} // string -> number, ex: 9 -> 'ut_metadata'

    // The extended handshake to send, minus the "m" field, which gets automatically
    // filled from `this.extendedMapping`
    this.extendedHandshake = {}

    this.peerExtendedHandshake = {} // remote peer's extended handshake

    // BEP6 Fast Estension
    this.hasFast = false // is fast extension enabled?
    this.allowedFastSet = [] // allowed fast set
    this.peerAllowedFastSet = [] // peer's allowed fast set

    this._ext = {} // string -> function, ex 'ut_metadata' -> ut_metadata()
    this._nextExt = 1

    this.uploaded = 0
    this.downloaded = 0
    this.uploadSpeed = throughput__WEBPACK_IMPORTED_MODULE_7__()
    this.downloadSpeed = throughput__WEBPACK_IMPORTED_MODULE_7__()

    this._keepAliveInterval = null
    this._timeout = null
    this._timeoutMs = 0
    this._timeoutExpiresAt = null

    this.destroyed = false // was the wire ended by calling `destroy`?
    this._finished = false

    this._parserSize = 0 // number of needed bytes to parse next message from remote peer
    this._parser = null // function to call once `this._parserSize` bytes are available

    this._buffer = [] // incomplete message data
    this._bufferSize = 0 // cached total length of buffers in `this._buffer`

    this._peEnabled = peEnabled
    if (peEnabled) {
      this._dh = crypto__WEBPACK_IMPORTED_MODULE_1__.createDiffieHellman(DH_PRIME, 'hex', DH_GENERATOR) // crypto object used to generate keys/secret
      this._myPubKey = this._dh.generateKeys('hex') // my DH public key
    } else {
      this._myPubKey = null
    }
    this._peerPubKey = null // peer's DH public key
    this._sharedSecret = null // shared DH secret
    this._peerCryptoProvide = [] // encryption methods provided by peer; we expect this to always contain 0x02
    this._cryptoHandshakeDone = false

    this._cryptoSyncPattern = null // the pattern to search for when resynchronizing after receiving pe1/pe2
    this._waitMaxBytes = null // the maximum number of bytes resynchronization must occur within
    this._encryptionMethod = null // 1 for plaintext, 2 for RC4
    this._encryptGenerator = null // RC4 keystream generator for encryption
    this._decryptGenerator = null // RC4 keystream generator for decryption
    this._setGenerators = false // a flag for whether setEncrypt() has successfully completed

    this.once('finish', () => this._onFinish())

    this.on('finish', this._onFinish)
    this._debug('type:', this.type)

    if (this.type === 'tcpIncoming' && this._peEnabled) {
      // If we are not the initiator, we should wait to see if the client begins
      // with PE/MSE handshake or the standard bittorrent handshake.
      this._determineHandshakeType()
    } else if (this.type === 'tcpOutgoing' && this._peEnabled && retries === 0) {
      this._parsePe2()
    } else {
      this._parseHandshake(null)
    }
  }

  /**
   * Set whether to send a "keep-alive" ping (sent every 55s)
   * @param {boolean} enable
   */
  setKeepAlive (enable) {
    this._debug('setKeepAlive %s', enable)
    clearInterval(this._keepAliveInterval)
    if (enable === false) return
    this._keepAliveInterval = setInterval(() => {
      this.keepAlive()
    }, KEEP_ALIVE_TIMEOUT)
  }

  /**
   * Set the amount of time to wait before considering a request to be "timed out"
   * @param {number} ms
   * @param {boolean=} unref (should the timer be unref'd? default: false)
   */
  setTimeout (ms, unref) {
    this._debug('setTimeout ms=%d unref=%s', ms, unref)
    this._timeoutMs = ms
    this._timeoutUnref = !!unref
    this._resetTimeout(true)
  }

  destroy () {
    if (this.destroyed) return
    this.destroyed = true
    this._debug('destroy')
    this.emit('close')
    this.end()
    return this
  }

  end (...args) {
    this._debug('end')
    this._onUninterested()
    this._onChoke()
    return super.end(...args)
  }

  /**
   * Use the specified protocol extension.
   * @param  {function} Extension
   */
  use (Extension) {
    const name = Extension.prototype.name
    if (!name) {
      throw new Error('Extension class requires a "name" property on the prototype')
    }
    this._debug('use extension.name=%s', name)

    const ext = this._nextExt
    const handler = new Extension(this)

    function noop () {}

    if (typeof handler.onHandshake !== 'function') {
      handler.onHandshake = noop
    }
    if (typeof handler.onExtendedHandshake !== 'function') {
      handler.onExtendedHandshake = noop
    }
    if (typeof handler.onMessage !== 'function') {
      handler.onMessage = noop
    }

    this.extendedMapping[ext] = name
    this._ext[name] = handler
    this[name] = handler

    this._nextExt += 1
  }

  //
  // OUTGOING MESSAGES
  //

  /**
   * Message "keep-alive": <len=0000>
   */
  keepAlive () {
    this._debug('keep-alive')
    this._push(MESSAGE_KEEP_ALIVE)
  }

  sendPe1 () {
    if (this._peEnabled) {
      const padALen = Math.floor(Math.random() * 513)
      const padA = randombytes__WEBPACK_IMPORTED_MODULE_3__(padALen)
      this._push((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .concat */ .zo)([(0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(this._myPubKey), padA]))
    }
  }

  sendPe2 () {
    const padBLen = Math.floor(Math.random() * 513)
    const padB = randombytes__WEBPACK_IMPORTED_MODULE_3__(padBLen)
    this._push((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .concat */ .zo)([(0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(this._myPubKey), padB]))
  }

  async sendPe3 (infoHash) {
    await this.setEncrypt(this._sharedSecret, infoHash)

    const hash1Buffer = await (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hash */ .vp)((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(this._utfToHex('req1') + this._sharedSecret))

    const hash2Buffer = await (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hash */ .vp)((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(this._utfToHex('req2') + infoHash))
    const hash3Buffer = await (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hash */ .vp)((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(this._utfToHex('req3') + this._sharedSecret))
    const hashesXorBuffer = xor(hash2Buffer, hash3Buffer)

    const padCLen = new DataView(randombytes__WEBPACK_IMPORTED_MODULE_3__(2).buffer).getUint16(0) % 512
    const padCBuffer = randombytes__WEBPACK_IMPORTED_MODULE_3__(padCLen)

    let vcAndProvideBuffer = new Uint8Array(8 + 4 + 2 + padCLen + 2)
    vcAndProvideBuffer.set(VC)
    vcAndProvideBuffer.set(CRYPTO_PROVIDE, 8)

    const view = new DataView(vcAndProvideBuffer.buffer)

    view.setInt16(12, padCLen) // pad C length
    padCBuffer.copy(vcAndProvideBuffer, 14)
    view.setInt16(14 + padCLen, 0) // IA length
    vcAndProvideBuffer = this._encryptHandshake(vcAndProvideBuffer)

    this._push((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .concat */ .zo)([hash1Buffer, hashesXorBuffer, vcAndProvideBuffer]))
  }

  async sendPe4 (infoHash) {
    await this.setEncrypt(this._sharedSecret, infoHash)

    const padDLen = new DataView(randombytes__WEBPACK_IMPORTED_MODULE_3__(2).buffer).getUint16(0) % 512
    const padDBuffer = randombytes__WEBPACK_IMPORTED_MODULE_3__(padDLen)
    let vcAndSelectBuffer = new Uint8Array(8 + 4 + 2 + padDLen)
    const view = new DataView(vcAndSelectBuffer.buffer)

    vcAndSelectBuffer.set(VC)
    vcAndSelectBuffer.set(CRYPTO_SELECT, 8)
    view.setInt16(12, padDLen) // lenD?
    vcAndSelectBuffer.set(padDBuffer, 14)
    vcAndSelectBuffer = this._encryptHandshake(vcAndSelectBuffer)
    this._push(vcAndSelectBuffer)
    this._cryptoHandshakeDone = true
    this._debug('completed crypto handshake')
  }

  /**
   * Message: "handshake" <pstrlen><pstr><reserved><info_hash><peer_id>
   * @param  {Uint8Array|string} infoHash (as Buffer or *hex* string)
   * @param  {Uint8Array|string} peerId
   * @param  {Object} extensions
   */
  handshake (infoHash, peerId, extensions) {
    let infoHashBuffer
    let peerIdBuffer
    if (typeof infoHash === 'string') {
      infoHash = infoHash.toLowerCase()
      infoHashBuffer = (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(infoHash)
    } else {
      infoHashBuffer = infoHash
      infoHash = (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2hex */ .oc)(infoHashBuffer)
    }
    if (typeof peerId === 'string') {
      peerIdBuffer = (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(peerId)
    } else {
      peerIdBuffer = peerId
      peerId = (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2hex */ .oc)(peerIdBuffer)
    }

    this._infoHash = infoHashBuffer

    if (infoHashBuffer.length !== 20 || peerIdBuffer.length !== 20) {
      throw new Error('infoHash and peerId MUST have length 20')
    }

    this._debug('handshake i=%s p=%s exts=%o', infoHash, peerId, extensions)

    const reserved = new Uint8Array(MESSAGE_RESERVED)

    this.extensions = {
      extended: true,
      dht: !!(extensions && extensions.dht),
      fast: !!(extensions && extensions.fast)
    }

    reserved[5] |= 0x10 // enable extended message
    if (this.extensions.dht) reserved[7] |= 0x01
    if (this.extensions.fast) reserved[7] |= 0x04

    // BEP6 Fast Extension: The extension is enabled only if both ends of the connection set this bit.
    if (this.extensions.fast && this.peerExtensions.fast) {
      this._debug('fast extension is enabled')
      this.hasFast = true
    }
    this._push((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .concat */ .zo)([MESSAGE_PROTOCOL, reserved, infoHashBuffer, peerIdBuffer]))
    this._handshakeSent = true

    if (this.peerExtensions.extended && !this._extendedHandshakeSent) {
      // Peer's handshake indicated support already
      // (incoming connection)
      this._sendExtendedHandshake()
    }
  }

  /* Peer supports BEP-0010, send extended handshake.
   *
   * This comes after the 'handshake' event to give the user a chance to populate
   * `this.extendedHandshake` and `this.extendedMapping` before the extended handshake
   * is sent to the remote peer.
   */
  _sendExtendedHandshake () {
    // Create extended message object from registered extensions
    const msg = Object.assign({}, this.extendedHandshake)
    msg.m = {}
    for (const ext in this.extendedMapping) {
      const name = this.extendedMapping[ext]
      msg.m[name] = Number(ext)
    }

    // Send extended handshake
    this.extended(0, bencode__WEBPACK_IMPORTED_MODULE_0__/* ["default"].encode */ .Z.encode(msg))
    this._extendedHandshakeSent = true
  }

  /**
   * Message "choke": <len=0001><id=0>
   */
  choke () {
    if (this.amChoking) return
    this.amChoking = true
    this._debug('choke')
    this._push(MESSAGE_CHOKE)

    if (this.hasFast) {
      // BEP6: If a peer sends a choke, it MUST reject all requests from the peer to whom the choke
      // was sent except it SHOULD NOT reject requests for pieces that are in the allowed fast set.
      let allowedCount = 0
      while (this.peerRequests.length > allowedCount) { // until only allowed requests are left
        const request = this.peerRequests[allowedCount] // first non-allowed request
        if (this.allowedFastSet.includes(request.piece)) {
          ++allowedCount // count request as allowed
        } else {
          this.reject(request.piece, request.offset, request.length) // removes from this.peerRequests
        }
      }
    } else {
      while (this.peerRequests.length) {
        this.peerRequests.pop()
      }
    }
  }

  /**
   * Message "unchoke": <len=0001><id=1>
   */
  unchoke () {
    if (!this.amChoking) return
    this.amChoking = false
    this._debug('unchoke')
    this._push(MESSAGE_UNCHOKE)
  }

  /**
   * Message "interested": <len=0001><id=2>
   */
  interested () {
    if (this.amInterested) return
    this.amInterested = true
    this._debug('interested')
    this._push(MESSAGE_INTERESTED)
  }

  /**
   * Message "uninterested": <len=0001><id=3>
   */
  uninterested () {
    if (!this.amInterested) return
    this.amInterested = false
    this._debug('uninterested')
    this._push(MESSAGE_UNINTERESTED)
  }

  /**
   * Message "have": <len=0005><id=4><piece index>
   * @param  {number} index
   */
  have (index) {
    this._debug('have %d', index)
    this._message(4, [index], null)
  }

  /**
   * Message "bitfield": <len=0001+X><id=5><bitfield>
   * @param  {BitField|Buffer} bitfield
   */
  bitfield (bitfield) {
    this._debug('bitfield')
    if (!ArrayBuffer.isView(bitfield)) bitfield = bitfield.buffer
    this._message(5, [], bitfield)
  }

  /**
   * Message "request": <len=0013><id=6><index><begin><length>
   * @param  {number}   index
   * @param  {number}   offset
   * @param  {number}   length
   * @param  {function} cb
   */
  request (index, offset, length, cb) {
    if (!cb) cb = () => {}
    if (this._finished) return cb(new Error('wire is closed'))

    if (this.peerChoking && !(this.hasFast && this.peerAllowedFastSet.includes(index))) {
      return cb(new Error('peer is choking'))
    }

    this._debug('request index=%d offset=%d length=%d', index, offset, length)

    this.requests.push(new Request(index, offset, length, cb))
    if (!this._timeout) {
      this._resetTimeout(true)
    }
    this._message(6, [index, offset, length], null)
  }

  /**
   * Message "piece": <len=0009+X><id=7><index><begin><block>
   * @param  {number} index
   * @param  {number} offset
   * @param  {Uint8Array} buffer
   */
  piece (index, offset, buffer) {
    this._debug('piece index=%d offset=%d', index, offset)
    this._message(7, [index, offset], buffer)
    this.uploaded += buffer.length
    this.uploadSpeed(buffer.length)
    this.emit('upload', buffer.length)
  }

  /**
   * Message "cancel": <len=0013><id=8><index><begin><length>
   * @param  {number} index
   * @param  {number} offset
   * @param  {number} length
   */
  cancel (index, offset, length) {
    this._debug('cancel index=%d offset=%d length=%d', index, offset, length)
    this._callback(
      this._pull(this.requests, index, offset, length),
      new Error('request was cancelled'),
      null
    )
    this._message(8, [index, offset, length], null)
  }

  /**
   * Message: "port" <len=0003><id=9><listen-port>
   * @param {Number} port
   */
  port (port) {
    this._debug('port %d', port)
    const message = new Uint8Array(MESSAGE_PORT)
    const view = new DataView(message.buffer)
    view.setUint16(5, port)
    this._push(message)
  }

  /**
   * Message: "suggest" <len=0x0005><id=0x0D><piece index> (BEP6)
   * @param {number} index
   */
  suggest (index) {
    if (!this.hasFast) throw Error('fast extension is disabled')
    this._debug('suggest %d', index)
    this._message(0x0D, [index], null)
  }

  /**
   * Message: "have-all" <len=0x0001><id=0x0E> (BEP6)
   */
  haveAll () {
    if (!this.hasFast) throw Error('fast extension is disabled')
    this._debug('have-all')
    this._push(MESSAGE_HAVE_ALL)
  }

  /**
   * Message: "have-none" <len=0x0001><id=0x0F> (BEP6)
   */
  haveNone () {
    if (!this.hasFast) throw Error('fast extension is disabled')
    this._debug('have-none')
    this._push(MESSAGE_HAVE_NONE)
  }

  /**
   * Message "reject": <len=0x000D><id=0x10><index><offset><length> (BEP6)
   * @param  {number}   index
   * @param  {number}   offset
   * @param  {number}   length
   */
  reject (index, offset, length) {
    if (!this.hasFast) throw Error('fast extension is disabled')
    this._debug('reject index=%d offset=%d length=%d', index, offset, length)
    this._pull(this.peerRequests, index, offset, length)
    this._message(0x10, [index, offset, length], null)
  }

  /**
   * Message: "allowed-fast" <len=0x0005><id=0x11><piece index> (BEP6)
   * @param {number} index
   */
  allowedFast (index) {
    if (!this.hasFast) throw Error('fast extension is disabled')
    this._debug('allowed-fast %d', index)
    if (!this.allowedFastSet.includes(index)) this.allowedFastSet.push(index)
    this._message(0x11, [index], null)
  }

  /**
   * Message: "extended" <len=0005+X><id=20><ext-number><payload>
   * @param  {number|string} ext
   * @param  {Object} obj
   */
  extended (ext, obj) {
    this._debug('extended ext=%s', ext)
    if (typeof ext === 'string' && this.peerExtendedMapping[ext]) {
      ext = this.peerExtendedMapping[ext]
    }
    if (typeof ext === 'number') {
      const extId = new Uint8Array([ext])
      const buf = ArrayBuffer.isView(obj) ? obj : bencode__WEBPACK_IMPORTED_MODULE_0__/* ["default"].encode */ .Z.encode(obj)

      this._message(20, [], (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .concat */ .zo)([extId, buf]))
    } else {
      throw new Error(`Unrecognized extension: ${ext}`)
    }
  }

  /**
   * Sets the encryption method for this wire, as per PSE/ME specification
   *
   * @param {string} sharedSecret:  A hex-encoded string, which is the shared secret agreed
   *                                upon from DH key exchange
   * @param {string} infoHash:  A hex-encoded info hash
   * @returns boolean, true if encryption setting succeeds, false if it fails.
   */
  async setEncrypt (sharedSecret, infoHash) {
    let encryptKeyBuf
    let encryptKeyIntArray
    let decryptKeyBuf
    let decryptKeyIntArray
    switch (this.type) {
      case 'tcpIncoming':
        encryptKeyBuf = await (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hash */ .vp)((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(this._utfToHex('keyB') + sharedSecret + infoHash))
        decryptKeyBuf = await (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hash */ .vp)((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(this._utfToHex('keyA') + sharedSecret + infoHash))
        encryptKeyIntArray = []
        for (const value of encryptKeyBuf.values()) {
          encryptKeyIntArray.push(value)
        }
        decryptKeyIntArray = []
        for (const value of decryptKeyBuf.values()) {
          decryptKeyIntArray.push(value)
        }
        this._encryptGenerator = new rc4__WEBPACK_IMPORTED_MODULE_4__(encryptKeyIntArray)
        this._decryptGenerator = new rc4__WEBPACK_IMPORTED_MODULE_4__(decryptKeyIntArray)
        break
      case 'tcpOutgoing':
        encryptKeyBuf = await (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hash */ .vp)((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(this._utfToHex('keyA') + sharedSecret + infoHash))
        decryptKeyBuf = await (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hash */ .vp)((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(this._utfToHex('keyB') + sharedSecret + infoHash))
        encryptKeyIntArray = []
        for (const value of encryptKeyBuf.values()) {
          encryptKeyIntArray.push(value)
        }
        decryptKeyIntArray = []
        for (const value of decryptKeyBuf.values()) {
          decryptKeyIntArray.push(value)
        }
        this._encryptGenerator = new rc4__WEBPACK_IMPORTED_MODULE_4__(encryptKeyIntArray)
        this._decryptGenerator = new rc4__WEBPACK_IMPORTED_MODULE_4__(decryptKeyIntArray)
        break
      default:
        return false
    }

    // Discard the first 1024 bytes, as per MSE/PE implementation
    for (let i = 0; i < 1024; i++) {
      this._encryptGenerator.randomByte()
      this._decryptGenerator.randomByte()
    }

    this._setGenerators = true
    return true
  }

  /**
   * Duplex stream method. Called whenever the remote peer stream wants data. No-op
   * since we'll just push data whenever we get it.
   */
  _read () {}

  /**
   * Send a message to the remote peer.
   */
  _message (id, numbers, data) {
    const dataLength = data ? data.length : 0
    const buffer = new Uint8Array(5 + (4 * numbers.length))
    const view = new DataView(buffer.buffer)

    view.setUint32(0, buffer.length + dataLength - 4)
    buffer[4] = id
    for (let i = 0; i < numbers.length; i++) {
      view.setUint32(5 + (4 * i), numbers[i])
    }

    this._push(buffer)
    if (data) this._push(data)
  }

  _push (data) {
    if (this._finished) return
    if (this._encryptionMethod === 2 && this._cryptoHandshakeDone) {
      data = this._encrypt(data)
    }
    return this.push(data)
  }

  //
  // INCOMING MESSAGES
  //

  _onKeepAlive () {
    this._debug('got keep-alive')
    this.emit('keep-alive')
  }

  _onPe1 (pubKeyBuffer) {
    this._peerPubKey = (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2hex */ .oc)(pubKeyBuffer)
    this._sharedSecret = this._dh.computeSecret(this._peerPubKey, 'hex', 'hex')
    this.emit('pe1')
  }

  _onPe2 (pubKeyBuffer) {
    this._peerPubKey = (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2hex */ .oc)(pubKeyBuffer)
    this._sharedSecret = this._dh.computeSecret(this._peerPubKey, 'hex', 'hex')
    this.emit('pe2')
  }

  async _onPe3 (hashesXorBuffer) {
    const hash3 = await ((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2hex */ .oc)(this._utfToHex('req3') + this._sharedSecret))
    const sKeyHash = (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2hex */ .oc)(xor(hash3, hashesXorBuffer))
    this.emit('pe3', sKeyHash)
  }

  _onPe3Encrypted (vcBuffer, peerProvideBuffer) {
    if (!(0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .equal */ .Dg)(vcBuffer, VC)) {
      this._debug('Error: verification constant did not match')
      this.destroy()
      return
    }

    for (const provideByte of peerProvideBuffer.values()) {
      if (provideByte !== 0) {
        this._peerCryptoProvide.push(provideByte)
      }
    }
    if (this._peerCryptoProvide.includes(2)) {
      this._encryptionMethod = 2
    } else {
      this._debug('Error: RC4 encryption method not provided by peer')
      this.destroy()
    }
  }

  _onPe4 (peerSelectBuffer) {
    this._encryptionMethod = peerSelectBuffer[3]
    if (!CRYPTO_PROVIDE.includes(this._encryptionMethod)) {
      this._debug('Error: peer selected invalid crypto method')
      this.destroy()
    }
    this._cryptoHandshakeDone = true
    this._debug('crypto handshake done')
    this.emit('pe4')
  }

  _onHandshake (infoHashBuffer, peerIdBuffer, extensions) {
    const infoHash = (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2hex */ .oc)(infoHashBuffer)
    const peerId = (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2hex */ .oc)(peerIdBuffer)

    this._debug('got handshake i=%s p=%s exts=%o', infoHash, peerId, extensions)

    this.peerId = peerId
    this.peerIdBuffer = peerIdBuffer
    this.peerExtensions = extensions

    // BEP6 Fast Extension: The extension is enabled only if both ends of the connection set this bit.
    if (this.extensions.fast && this.peerExtensions.fast) {
      this._debug('fast extension is enabled')
      this.hasFast = true
    }

    this.emit('handshake', infoHash, peerId, extensions)

    for (const name in this._ext) {
      this._ext[name].onHandshake(infoHash, peerId, extensions)
    }

    if (extensions.extended && this._handshakeSent &&
        !this._extendedHandshakeSent) {
      // outgoing connection
      this._sendExtendedHandshake()
    }
  }

  _onChoke () {
    this.peerChoking = true
    this._debug('got choke')
    this.emit('choke')
    if (!this.hasFast) {
      // BEP6 Fast Extension: Choke no longer implicitly rejects all pending requests
      while (this.requests.length) {
        this._callback(this.requests.pop(), new Error('peer is choking'), null)
      }
    }
  }

  _onUnchoke () {
    this.peerChoking = false
    this._debug('got unchoke')
    this.emit('unchoke')
  }

  _onInterested () {
    this.peerInterested = true
    this._debug('got interested')
    this.emit('interested')
  }

  _onUninterested () {
    this.peerInterested = false
    this._debug('got uninterested')
    this.emit('uninterested')
  }

  _onHave (index) {
    if (this.peerPieces.get(index)) return
    this._debug('got have %d', index)

    this.peerPieces.set(index, true)
    this.emit('have', index)
  }

  _onBitField (buffer) {
    this.peerPieces = new bitfield__WEBPACK_IMPORTED_MODULE_9__/* ["default"] */ .Z(buffer)
    this._debug('got bitfield')
    this.emit('bitfield', this.peerPieces)
  }

  _onRequest (index, offset, length) {
    if (this.amChoking && !(this.hasFast && this.allowedFastSet.includes(index))) {
      // BEP6: If a peer receives a request from a peer its choking, the peer receiving
      // the request SHOULD send a reject unless the piece is in the allowed fast set.
      if (this.hasFast) this.reject(index, offset, length)
      return
    }
    this._debug('got request index=%d offset=%d length=%d', index, offset, length)

    const respond = (err, buffer) => {
      if (request !== this._pull(this.peerRequests, index, offset, length)) return
      if (err) {
        this._debug('error satisfying request index=%d offset=%d length=%d (%s)', index, offset, length, err.message)
        if (this.hasFast) this.reject(index, offset, length)
        return
      }
      this.piece(index, offset, buffer)
    }

    const request = new Request(index, offset, length, respond)
    this.peerRequests.push(request)
    this.emit('request', index, offset, length, respond)
  }

  _onPiece (index, offset, buffer) {
    this._debug('got piece index=%d offset=%d', index, offset)
    this._callback(this._pull(this.requests, index, offset, buffer.length), null, buffer)
    this.downloaded += buffer.length
    this.downloadSpeed(buffer.length)
    this.emit('download', buffer.length)
    this.emit('piece', index, offset, buffer)
  }

  _onCancel (index, offset, length) {
    this._debug('got cancel index=%d offset=%d length=%d', index, offset, length)
    this._pull(this.peerRequests, index, offset, length)
    this.emit('cancel', index, offset, length)
  }

  _onPort (port) {
    this._debug('got port %d', port)
    this.emit('port', port)
  }

  _onSuggest (index) {
    if (!this.hasFast) {
      // BEP6: the peer MUST close the connection
      this._debug('Error: got suggest whereas fast extension is disabled')
      this.destroy()
      return
    }
    this._debug('got suggest %d', index)
    this.emit('suggest', index)
  }

  _onHaveAll () {
    if (!this.hasFast) {
      // BEP6: the peer MUST close the connection
      this._debug('Error: got have-all whereas fast extension is disabled')
      this.destroy()
      return
    }
    this._debug('got have-all')
    this.peerPieces = new HaveAllBitField()
    this.emit('have-all')
  }

  _onHaveNone () {
    if (!this.hasFast) {
      // BEP6: the peer MUST close the connection
      this._debug('Error: got have-none whereas fast extension is disabled')
      this.destroy()
      return
    }
    this._debug('got have-none')
    this.emit('have-none')
  }

  _onReject (index, offset, length) {
    if (!this.hasFast) {
      // BEP6: the peer MUST close the connection
      this._debug('Error: got reject whereas fast extension is disabled')
      this.destroy()
      return
    }
    this._debug('got reject index=%d offset=%d length=%d', index, offset, length)
    this._callback(
      this._pull(this.requests, index, offset, length),
      new Error('request was rejected'),
      null
    )
    this.emit('reject', index, offset, length)
  }

  _onAllowedFast (index) {
    if (!this.hasFast) {
      // BEP6: the peer MUST close the connection
      this._debug('Error: got allowed-fast whereas fast extension is disabled')
      this.destroy()
      return
    }
    this._debug('got allowed-fast %d', index)
    if (!this.peerAllowedFastSet.includes(index)) this.peerAllowedFastSet.push(index)
    if (this.peerAllowedFastSet.length > ALLOWED_FAST_SET_MAX_LENGTH) this.peerAllowedFastSet.shift()
    this.emit('allowed-fast', index)
  }

  _onExtended (ext, buf) {
    if (ext === 0) {
      let info
      try {
        info = bencode__WEBPACK_IMPORTED_MODULE_0__/* ["default"].decode */ .Z.decode(buf)
      } catch (err) {
        this._debug('ignoring invalid extended handshake: %s', err.message || err)
      }

      if (!info) return
      this.peerExtendedHandshake = info

      if (typeof info.m === 'object') {
        for (const name in info.m) {
          this.peerExtendedMapping[name] = Number(info.m[name].toString())
        }
      }
      for (const name in this._ext) {
        if (this.peerExtendedMapping[name]) {
          this._ext[name].onExtendedHandshake(this.peerExtendedHandshake)
        }
      }
      this._debug('got extended handshake')
      this.emit('extended', 'handshake', this.peerExtendedHandshake)
    } else {
      if (this.extendedMapping[ext]) {
        ext = this.extendedMapping[ext] // friendly name for extension
        if (this._ext[ext]) {
          // there is an registered extension handler, so call it
          this._ext[ext].onMessage(buf)
        }
      }
      this._debug('got extended message ext=%s', ext)
      this.emit('extended', ext, buf)
    }
  }

  _onTimeout () {
    this._debug('request timed out')
    this._callback(this.requests.shift(), new Error('request has timed out'), null)
    this.emit('timeout')
  }

  /**
   * Duplex stream method. Called whenever the remote peer has data for us. Data that the
   * remote peer sends gets buffered (i.e. not actually processed) until the right number
   * of bytes have arrived, determined by the last call to `this._parse(number, callback)`.
   * Once enough bytes have arrived to process the message, the callback function
   * (i.e. `this._parser`) gets called with the full buffer of data.
   * @param  {Uint8Array} data
   * @param  {string} encoding
   * @param  {function} cb
   */
  _write (data, encoding, cb) {
    if (this._encryptionMethod === 2 && this._cryptoHandshakeDone) {
      data = this._decrypt(data)
    }
    this._bufferSize += data.length
    this._buffer.push(data)
    if (this._buffer.length > 1) {
      this._buffer = [(0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .concat */ .zo)(this._buffer, this._bufferSize)]
    }
    // now this._buffer is an array containing a single Buffer
    if (this._cryptoSyncPattern) {
      const index = this._buffer[0].indexOf(this._cryptoSyncPattern)
      if (index !== -1) {
        this._buffer[0] = this._buffer[0].slice(index + this._cryptoSyncPattern.length)
        this._bufferSize -= (index + this._cryptoSyncPattern.length)
        this._cryptoSyncPattern = null
      } else if (this._bufferSize + data.length > this._waitMaxBytes + this._cryptoSyncPattern.length) {
        this._debug('Error: could not resynchronize')
        this.destroy()
        return
      }
    }

    while (this._bufferSize >= this._parserSize && !this._cryptoSyncPattern) {
      if (this._parserSize === 0) {
        this._parser(new Uint8Array())
      } else {
        const buffer = this._buffer[0]
        // console.log('buffer:', this._buffer)
        this._bufferSize -= this._parserSize
        this._buffer = this._bufferSize
          ? [buffer.slice(this._parserSize)]
          : []
        this._parser(buffer.slice(0, this._parserSize))
      }
    }

    cb(null) // Signal that we're ready for more data
  }

  _callback (request, err, buffer) {
    if (!request) return

    this._resetTimeout(!this.peerChoking && !this._finished)

    request.callback(err, buffer)
  }

  _resetTimeout (setAgain) {
    if (!setAgain || !this._timeoutMs || !this.requests.length) {
      clearTimeout(this._timeout)
      this._timeout = null
      this._timeoutExpiresAt = null
      return
    }

    const timeoutExpiresAt = Date.now() + this._timeoutMs

    if (this._timeout) {
      // If existing expiration is already within 5% of correct, it's close enough
      if (timeoutExpiresAt - this._timeoutExpiresAt < this._timeoutMs * 0.05) {
        return
      }
      clearTimeout(this._timeout)
    }

    this._timeoutExpiresAt = timeoutExpiresAt
    this._timeout = setTimeout(() => this._onTimeout(), this._timeoutMs)
    if (this._timeoutUnref && this._timeout.unref) this._timeout.unref()
  }

  /**
   * Takes a number of bytes that the local peer is waiting to receive from the remote peer
   * in order to parse a complete message, and a callback function to be called once enough
   * bytes have arrived.
   * @param  {number} size
   * @param  {function} parser
   */
  _parse (size, parser) {
    this._parserSize = size
    this._parser = parser
  }

  _parseUntil (pattern, maxBytes) {
    this._cryptoSyncPattern = pattern
    this._waitMaxBytes = maxBytes
  }

  /**
   * Handle the first 4 bytes of a message, to determine the length of bytes that must be
   * waited for in order to have the whole message.
   * @param  {Uint8Array} buffer
   */
  _onMessageLength (buffer) {
    const length = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength).getUint32(0)
    if (length > 0) {
      this._parse(length, this._onMessage)
    } else {
      this._onKeepAlive()
      this._parse(4, this._onMessageLength)
    }
  }

  /**
   * Handle a message from the remote peer.
   * @param  {Uint8Array} buffer
   */
  _onMessage (buffer) {
    this._parse(4, this._onMessageLength)
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    switch (buffer[0]) {
      case 0:
        return this._onChoke()
      case 1:
        return this._onUnchoke()
      case 2:
        return this._onInterested()
      case 3:
        return this._onUninterested()
      case 4:
        return this._onHave(view.getUint32(1))
      case 5:
        return this._onBitField(buffer.slice(1))
      case 6:
        return this._onRequest(
          view.getUint32(1),
          view.getUint32(5),
          view.getUint32(9)
        )
      case 7:
        return this._onPiece(
          view.getUint32(1),
          view.getUint32(5),
          buffer.slice(9)
        )
      case 8:
        return this._onCancel(
          view.getUint32(1),
          view.getUint32(5),
          view.getUint32(9)
        )
      case 9:
        return this._onPort(view.getUint16(1))
      case 0x0D:
        return this._onSuggest(view.getUint32(1))
      case 0x0E:
        return this._onHaveAll()
      case 0x0F:
        return this._onHaveNone()
      case 0x10:
        return this._onReject(
          view.getUint32(1),
          view.getUint32(5),
          view.getUint32(9)
        )
      case 0x11:
        return this._onAllowedFast(view.getUint32(1))
      case 20:
        return this._onExtended(buffer[1], buffer.slice(2))
      default:
        this._debug('got unknown message')
        return this.emit('unknownmessage', buffer)
    }
  }

  _determineHandshakeType () {
    this._parse(1, pstrLenBuffer => {
      const pstrlen = pstrLenBuffer[0]
      if (pstrlen === 19) {
        this._parse(pstrlen + 48, this._onHandshakeBuffer)
      } else {
        this._parsePe1(pstrLenBuffer)
      }
    })
  }

  _parsePe1 (pubKeyPrefix) {
    this._parse(95, pubKeySuffix => {
      this._onPe1((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .concat */ .zo)([pubKeyPrefix, pubKeySuffix]))
      this._parsePe3()
    })
  }

  _parsePe2 () {
    this._parse(96, pubKey => {
      this._onPe2(pubKey)
      while (!this._setGenerators) {
        // Wait until generators have been set
      }
      this._parsePe4()
    })
  }

  // Handles the unencrypted portion of step 4
  async _parsePe3 () {
    const hash1Buffer = await (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hash */ .vp)((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .hex2arr */ ._0)(this._utfToHex('req1') + this._sharedSecret))
    // synchronize on HASH('req1', S)
    this._parseUntil(hash1Buffer, 512)
    this._parse(20, buffer => {
      this._onPe3(buffer)
      while (!this._setGenerators) {
        // Wait until generators have been set
      }
      this._parsePe3Encrypted()
    })
  }

  _parsePe3Encrypted () {
    this._parse(14, buffer => {
      const vcBuffer = this._decryptHandshake(buffer.slice(0, 8))
      const peerProvideBuffer = this._decryptHandshake(buffer.slice(8, 12))
      const padCLen = new DataView(this._decryptHandshake(buffer.slice(12, 14)).buffer).getUint16(0)
      this._parse(padCLen, padCBuffer => {
        padCBuffer = this._decryptHandshake(padCBuffer)
        this._parse(2, iaLenBuf => {
          const iaLen = new DataView(this._decryptHandshake(iaLenBuf).buffer).getUint16(0)
          this._parse(iaLen, iaBuffer => {
            iaBuffer = this._decryptHandshake(iaBuffer)
            this._onPe3Encrypted(vcBuffer, peerProvideBuffer, padCBuffer, iaBuffer)
            const pstrlen = iaLen ? iaBuffer[0] : null
            const protocol = iaLen ? iaBuffer.slice(1, 20) : null
            if (pstrlen === 19 && (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2text */ .vV)(protocol) === 'BitTorrent protocol') {
              this._onHandshakeBuffer(iaBuffer.slice(1))
            } else {
              this._parseHandshake()
            }
          })
        })
      })
    })
  }

  _parsePe4 () {
    // synchronize on ENCRYPT(VC).
    // since we encrypt using bitwise xor, decryption and encryption are the same operation.
    // calling _decryptHandshake here advances the decrypt generator keystream forward 8 bytes
    const vcBufferEncrypted = this._decryptHandshake(VC)
    this._parseUntil(vcBufferEncrypted, 512)
    this._parse(6, buffer => {
      const peerSelectBuffer = this._decryptHandshake(buffer.slice(0, 4))
      const padDLen = new DataView(this._decryptHandshake(buffer.slice(4, 6)).buffer).getUint16(0)
      this._parse(padDLen, padDBuf => {
        this._decryptHandshake(padDBuf)
        this._onPe4(peerSelectBuffer)
        this._parseHandshake(null)
      })
    })
  }

  /**
   * Reads the handshake as specified by the bittorrent wire protocol.
   */
  _parseHandshake () {
    this._parse(1, buffer => {
      const pstrlen = buffer[0]
      if (pstrlen !== 19) {
        this._debug('Error: wire not speaking BitTorrent protocol (%s)', pstrlen.toString())
        this.end()
        return
      }
      this._parse(pstrlen + 48, this._onHandshakeBuffer)
    })
  }

  _onHandshakeBuffer (handshake) {
    const protocol = handshake.slice(0, 19)
    if ((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2text */ .vV)(protocol) !== 'BitTorrent protocol') {
      this._debug('Error: wire not speaking BitTorrent protocol (%s)', (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2text */ .vV)(protocol))
      this.end()
      return
    }
    handshake = handshake.slice(19)
    this._onHandshake(handshake.slice(8, 28), handshake.slice(28, 48), {
      dht: !!(handshake[7] & 0x01), // see bep_0005
      fast: !!(handshake[7] & 0x04), // see bep_0006
      extended: !!(handshake[5] & 0x10) // see bep_0010
    })
    this._parse(4, this._onMessageLength)
  }

  _onFinish () {
    this._finished = true

    this.push(null) // stream cannot be half open, so signal the end of it
    while (this.read()) {
      // body intentionally empty
      // consume and discard the rest of the stream data
    }

    clearInterval(this._keepAliveInterval)
    this._parse(Number.MAX_VALUE, () => {})
    while (this.peerRequests.length) {
      this.peerRequests.pop()
    }
    while (this.requests.length) {
      this._callback(this.requests.pop(), new Error('wire was closed'), null)
    }
  }

  _debug (...args) {
    args[0] = `[${this._debugId}] ${args[0]}`
    debug(...args)
  }

  _pull (requests, piece, offset, length) {
    for (let i = 0; i < requests.length; i++) {
      const req = requests[i]
      if (req.piece === piece && req.offset === offset && req.length === length) {
        unordered_array_remove__WEBPACK_IMPORTED_MODULE_8__(requests, i)
        return req
      }
    }
    return null
  }

  _encryptHandshake (buf) {
    const crypt = new Uint8Array(buf)
    if (!this._encryptGenerator) {
      this._debug('Warning: Encrypting without any generator')
      return crypt
    }

    for (let i = 0; i < buf.length; i++) {
      const keystream = this._encryptGenerator.randomByte()
      crypt[i] = crypt[i] ^ keystream
    }

    return crypt
  }

  _encrypt (buf) {
    const crypt = new Uint8Array(buf)

    if (!this._encryptGenerator || this._encryptionMethod !== 2) {
      return crypt
    }
    for (let i = 0; i < buf.length; i++) {
      const keystream = this._encryptGenerator.randomByte()
      crypt[i] = crypt[i] ^ keystream
    }

    return crypt
  }

  _decryptHandshake (buf) {
    const decrypt = new Uint8Array(buf)

    if (!this._decryptGenerator) {
      this._debug('Warning: Decrypting without any generator')
      return decrypt
    }
    for (let i = 0; i < buf.length; i++) {
      const keystream = this._decryptGenerator.randomByte()
      decrypt[i] = decrypt[i] ^ keystream
    }

    return decrypt
  }

  _decrypt (buf) {
    const decrypt = new Uint8Array(buf)

    if (!this._decryptGenerator || this._encryptionMethod !== 2) {
      return decrypt
    }
    for (let i = 0; i < buf.length; i++) {
      const keystream = this._decryptGenerator.randomByte()
      decrypt[i] = decrypt[i] ^ keystream
    }

    return decrypt
  }

  _utfToHex (str) {
    return (0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .arr2hex */ .oc)((0,uint8_util__WEBPACK_IMPORTED_MODULE_6__/* .text2arr */ .gR)(str))
  }
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Wire);


/***/ }),

/***/ 5194:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "te": () => (/* binding */ arr2base),
  "oc": () => (/* reexport */ arr2hex),
  "vV": () => (/* binding */ arr2text),
  "Ff": () => (/* binding */ bin2hex),
  "zo": () => (/* reexport */ concat),
  "Dg": () => (/* reexport */ equal),
  "vp": () => (/* binding */ hash),
  "_0": () => (/* reexport */ hex2arr),
  "gR": () => (/* binding */ text2arr)
});

// UNUSED EXPORTS: alphabet, base2arr, hex2bin, randomBytes

;// CONCATENATED MODULE: ./node_modules/uint8-util/util.js
/* Common package for dealing with hex/string/uint8 conversions (and sha1 hashing)
*
* @author   Jimmy Wärting <jimmy@warting.se> (https://jimmy.warting.se/opensource)
* @license  MIT
*/
const alphabet = '0123456789abcdef'
const encodeLookup = []
const decodeLookup = []

for (let i = 0; i < 256; i++) {
  encodeLookup[i] = alphabet[i >> 4 & 0xf] + alphabet[i & 0xf]
  if (i < 16) {
    if (i < 10) {
      decodeLookup[0x30 + i] = i
    } else {
      decodeLookup[0x61 - 10 + i] = i
    }
  }
}

const arr2hex = data => {
  const length = data.length
  let string = ''
  let i = 0
  while (i < length) {
    string += encodeLookup[data[i++]]
  }
  return string
}

const hex2arr = str => {
  const sizeof = str.length >> 1
  const length = sizeof << 1
  const array = new Uint8Array(sizeof)
  let n = 0
  let i = 0
  while (i < length) {
    array[n++] = decodeLookup[str.charCodeAt(i++)] << 4 | decodeLookup[str.charCodeAt(i++)]
  }
  return array
}

const concat = (chunks, size) => {
  if (!size) {
    size = 0
    let i = chunks.length || chunks.byteLength || 0
    while (i--) size += chunks[i].length
  }
  const b = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    b.set(chunk, offset)
    offset += chunk.byteLength || chunk.length
  }

  return b
}

const equal = (a, b) => {
  if (a.byteLength !== b.byteLength) return false
  for (let i = a.length; i > -1; i -= 1) {
    if ((a[i] !== b[i])) return false
  }
  return true
}

;// CONCATENATED MODULE: ./node_modules/base64-arraybuffer/dist/base64-arraybuffer.es5.js
/*
 * base64-arraybuffer 1.0.2 <https://github.com/niklasvh/base64-arraybuffer>
 * Copyright (c) 2022 Niklas von Hertzen <https://hertzen.com>
 * Released under MIT License
 */
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// Use a lookup table to find the index.
var lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
for (var i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
}
var encode = function (arraybuffer) {
    var bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = '';
    for (i = 0; i < len; i += 3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
    }
    if (len % 3 === 2) {
        base64 = base64.substring(0, base64.length - 1) + '=';
    }
    else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2) + '==';
    }
    return base64;
};
var base64_arraybuffer_es5_decode = function (base64) {
    var bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
    if (base64[base64.length - 1] === '=') {
        bufferLength--;
        if (base64[base64.length - 2] === '=') {
            bufferLength--;
        }
    }
    var arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
    for (i = 0; i < len; i += 4) {
        encoded1 = lookup[base64.charCodeAt(i)];
        encoded2 = lookup[base64.charCodeAt(i + 1)];
        encoded3 = lookup[base64.charCodeAt(i + 2)];
        encoded4 = lookup[base64.charCodeAt(i + 3)];
        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
    return arraybuffer;
};


//# sourceMappingURL=base64-arraybuffer.es5.js.map

;// CONCATENATED MODULE: ./node_modules/uint8-util/browser.js



const decoder = new TextDecoder()
// 50% slower at < 48 chars, but little impact at 4M OPS/s vs 8M OPS/s
const arr2text = (data, enc) => {
  if (!enc) return decoder.decode(data)
  const dec = new TextDecoder(enc)
  return dec.decode(data)
}

// sacrifice ~20% speed for bundle size
const encoder = new TextEncoder()
const text2arr = str => encoder.encode(str)

const arr2base = data => encode(data)

const base2arr = str => new Uint8Array(decode(str))

const bin2hex = str => {
  let res = ''
  let c
  let i = 0
  const len = str.length

  while (i < len) {
    c = str.charCodeAt(i++)
    res += alphabet[c >> 4]
    res += alphabet[c & 0xF]
  }

  return res
}

const MAX_ARGUMENTS_LENGTH = 0x10000
const hex2bin = hex => {
  const points = new Array(hex.length / 2)
  for (let i = 0, l = hex.length / 2; i < l; ++i) {
    points[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  if (points.length <= MAX_ARGUMENTS_LENGTH) return String.fromCharCode(...points)

  let res = ''
  let i = 0
  while (i < points.length) {
    res += String.fromCharCode(...points.slice(i, i += MAX_ARGUMENTS_LENGTH))
  }
  return res
}

const scope = typeof window !== 'undefined' ? window : self
const browser_crypto = scope.crypto || scope.msCrypto || {}
const subtle = browser_crypto.subtle || browser_crypto.webkitSubtle

const formatMap = {
  hex: arr2hex,
  base64: arr2base
}

const hash = async (data, format, algo = 'sha-1') => {
  if (!subtle) throw new Error('no web crypto support')
  if (typeof data === 'string') data = text2arr(data)
  const out = new Uint8Array(await subtle.digest(algo, data))
  return format ? formatMap[format](out) : out
}

const randomBytes = size => {
  const view = new Uint8Array(size)
  return browser_crypto.getRandomValues(view)
}




/***/ }),

/***/ 8768:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "addListener": () => (/* binding */ addListener),
/* harmony export */   "argv": () => (/* binding */ argv),
/* harmony export */   "binding": () => (/* binding */ binding),
/* harmony export */   "browser": () => (/* binding */ browser),
/* harmony export */   "chdir": () => (/* binding */ chdir),
/* harmony export */   "cwd": () => (/* binding */ cwd),
/* harmony export */   "emit": () => (/* binding */ emit),
/* harmony export */   "env": () => (/* binding */ env),
/* harmony export */   "listeners": () => (/* binding */ listeners),
/* harmony export */   "nextTick": () => (/* binding */ nextTick),
/* harmony export */   "off": () => (/* binding */ off),
/* harmony export */   "on": () => (/* binding */ on),
/* harmony export */   "once": () => (/* binding */ once),
/* harmony export */   "prependListener": () => (/* binding */ prependListener),
/* harmony export */   "prependOnceListener": () => (/* binding */ prependOnceListener),
/* harmony export */   "removeAllListeners": () => (/* binding */ removeAllListeners),
/* harmony export */   "removeListener": () => (/* binding */ removeListener),
/* harmony export */   "title": () => (/* binding */ title),
/* harmony export */   "umask": () => (/* binding */ umask),
/* harmony export */   "version": () => (/* binding */ version),
/* harmony export */   "versions": () => (/* binding */ versions)
/* harmony export */ });
/* harmony import */ var queue_microtask__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4375);
/*!
 * Fast node `require('process')` for modern browsers
 *
 * @author   Mathias Rasmussen <mathiasvr@gmail.com>
 * @license  MIT
 */


const title = 'browser'
const browser = true
const env = {}
const argv = []
const version = ''
const versions = {}

function noop () {}

const on = noop
const addListener = noop
const once = noop
const off = noop
const removeListener = noop
const removeAllListeners = noop
const emit = noop
const prependListener = noop
const prependOnceListener = noop

const nextTick = (func, ...args) => queue_microtask__WEBPACK_IMPORTED_MODULE_0__(() => func(...args))

const listeners = (name) => []

const cwd = () => '/'
const umask = () => 0
const binding = (name) => { throw new Error('process.binding is not supported') }
const chdir = (dir) => { throw new Error('process.chdir is not supported') }




/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/create fake namespace object */
/******/ (() => {
/******/ 	var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 	var leafPrototypes;
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 16: return value when it's Promise-like
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = this(value);
/******/ 		if(mode & 8) return value;
/******/ 		if(typeof value === 'object' && value) {
/******/ 			if((mode & 4) && value.__esModule) return value;
/******/ 			if((mode & 16) && typeof value.then === 'function') return value;
/******/ 		}
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		var def = {};
/******/ 		leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 		for(var current = mode & 2 && value; typeof current == 'object' && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 			Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 		}
/******/ 		def['default'] = () => (value);
/******/ 		__webpack_require__.d(ns, def);
/******/ 		return ns;
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Z": () => (/* binding */ WebTorrent)
});

// EXTERNAL MODULE: ./node_modules/events/events.js
var events = __webpack_require__(7187);
// EXTERNAL MODULE: ./node_modules/path-browserify/index.js
var path_browserify = __webpack_require__(6470);
// EXTERNAL MODULE: ./node_modules/simple-concat/index.js
var simple_concat = __webpack_require__(7485);
// EXTERNAL MODULE: ./node_modules/bencode/index.js + 4 modules
var bencode = __webpack_require__(502);
// EXTERNAL MODULE: ./node_modules/block-iterator/index.js
var block_iterator = __webpack_require__(2090);
// EXTERNAL MODULE: ./node_modules/piece-length/index.js
var piece_length = __webpack_require__(3786);
// EXTERNAL MODULE: is-file (ignored)
var is_file_ignored_ = __webpack_require__(970);
// EXTERNAL MODULE: ./node_modules/junk/index.js
var junk = __webpack_require__(1351);
// EXTERNAL MODULE: ./node_modules/join-async-iterator/index.js
var join_async_iterator = __webpack_require__(8225);
// EXTERNAL MODULE: ./node_modules/run-parallel/index.js
var run_parallel = __webpack_require__(4595);
// EXTERNAL MODULE: ./node_modules/queue-microtask/index.js
var queue_microtask = __webpack_require__(4375);
// EXTERNAL MODULE: ./node_modules/uint8-util/browser.js + 2 modules
var browser = __webpack_require__(5194);
// EXTERNAL MODULE: ./node_modules/fast-readable-async-iterator/index.js
var fast_readable_async_iterator = __webpack_require__(3811);
// EXTERNAL MODULE: ./get-files.js (ignored)
var get_files_ignored_ = __webpack_require__(2911);
;// CONCATENATED MODULE: ./node_modules/create-torrent/index.js
/*! create-torrent. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */












 // browser exclude

const announceList = [
  ['udp://tracker.leechers-paradise.org:6969'],
  ['udp://tracker.coppersurfer.tk:6969'],
  ['udp://tracker.opentrackr.org:1337'],
  ['udp://explodie.org:6969'],
  ['udp://tracker.empire-js.us:1337'],
  ['wss://tracker.btorrent.xyz'],
  ['wss://tracker.openwebtorrent.com']
]

/**
 * Create a torrent.
 * @param  {string|File|FileList|Buffer|Stream|Array.<string|File|Buffer|Stream>} input
 * @param  {Object} opts
 * @param  {string=} opts.name
 * @param  {Date=} opts.creationDate
 * @param  {string=} opts.comment
 * @param  {string=} opts.createdBy
 * @param  {boolean|number=} opts.private
 * @param  {number=} opts.pieceLength
 * @param  {Array.<Array.<string>>=} opts.announceList
 * @param  {Array.<string>=} opts.urlList
 * @param  {Object=} opts.info
 * @param  {Function} opts.onProgress
 * @param  {function} cb
 * @return {Buffer} buffer of .torrent file data
 */
function createTorrent (input, opts, cb) {
  if (typeof opts === 'function') [opts, cb] = [cb, opts]
  opts = opts ? Object.assign({}, opts) : {}

  _parseInput(input, opts, (err, files, singleFileTorrent) => {
    if (err) return cb(err)
    opts.singleFileTorrent = singleFileTorrent
    onFiles(files, opts, cb)
  })
}

function parseInput (input, opts, cb) {
  if (typeof opts === 'function') [opts, cb] = [cb, opts]
  opts = opts ? Object.assign({}, opts) : {}
  _parseInput(input, opts, cb)
}

const pathSymbol = Symbol('itemPath')

/**
 * Parse input file and return file information.
 */
function _parseInput (input, opts, cb) {
  if (isFileList(input)) input = Array.from(input)
  if (!Array.isArray(input)) input = [input]

  if (input.length === 0) throw new Error('invalid input type')

  input.forEach(item => {
    if (item == null) throw new Error(`invalid input type: ${item}`)
  })

  // In Electron, use the true file path
  input = input.map(item => {
    if (isBlob(item) && typeof item.path === 'string' && typeof get_files_ignored_ === 'function') return item.path
    return item
  })

  // If there's just one file, allow the name to be set by `opts.name`
  if (input.length === 1 && typeof input[0] !== 'string' && !input[0].name) input[0].name = opts.name

  let commonPrefix = null
  input.forEach((item, i) => {
    if (typeof item === 'string') {
      return
    }

    let path = item.fullPath || item.name
    if (!path) {
      path = `Unknown File ${i + 1}`
      item.unknownName = true
    }

    item[pathSymbol] = path.split('/')

    // Remove initial slash
    if (!item[pathSymbol][0]) {
      item[pathSymbol].shift()
    }

    if (item[pathSymbol].length < 2) { // No real prefix
      commonPrefix = null
    } else if (i === 0 && input.length > 1) { // The first file has a prefix
      commonPrefix = item[pathSymbol][0]
    } else if (item[pathSymbol][0] !== commonPrefix) { // The prefix doesn't match
      commonPrefix = null
    }
  })

  const filterJunkFiles = opts.filterJunkFiles === undefined ? true : opts.filterJunkFiles
  if (filterJunkFiles) {
    // Remove junk files
    input = input.filter(item => {
      if (typeof item === 'string') {
        return true
      }
      return !isJunkPath(item[pathSymbol])
    })
  }

  if (commonPrefix) {
    input.forEach(item => {
      const pathless = (ArrayBuffer.isView(item) || isReadable(item)) && !item[pathSymbol]
      if (typeof item === 'string' || pathless) return
      item[pathSymbol].shift()
    })
  }

  if (!opts.name && commonPrefix) {
    opts.name = commonPrefix
  }

  if (!opts.name) {
    // use first user-set file name
    input.some(item => {
      if (typeof item === 'string') {
        opts.name = path_browserify.basename(item)
        return true
      } else if (!item.unknownName) {
        opts.name = item[pathSymbol][item[pathSymbol].length - 1]
        return true
      }
      return false
    })
  }

  if (!opts.name) {
    opts.name = `Unnamed Torrent ${Date.now()}`
  }

  const numPaths = input.reduce((sum, item) => sum + Number(typeof item === 'string'), 0)

  let isSingleFileTorrent = (input.length === 1)

  if (input.length === 1 && typeof input[0] === 'string') {
    if (typeof get_files_ignored_ !== 'function') {
      throw new Error('filesystem paths do not work in the browser')
    }
    // If there's a single path, verify it's a file before deciding this is a single
    // file torrent
    is_file_ignored_(input[0], (err, pathIsFile) => {
      if (err) return cb(err)
      isSingleFileTorrent = pathIsFile
      processInput()
    })
  } else {
    queue_microtask(processInput)
  }

  function processInput () {
    run_parallel(input.map(item => cb => {
      const file = {}

      if (isBlob(item)) {
        file.getStream = item.stream()
        file.length = item.size
      } else if (ArrayBuffer.isView(item)) {
        file.getStream = [item] // wrap in iterable to write entire buffer at once instead of unwrapping all bytes
        file.length = item.length
      } else if (isReadable(item)) {
        file.getStream = getStreamStream(item, file)
        file.length = 0
      } else if (typeof item === 'string') {
        if (typeof get_files_ignored_ !== 'function') {
          throw new Error('filesystem paths do not work in the browser')
        }
        const keepRoot = numPaths > 1 || isSingleFileTorrent
        get_files_ignored_(item, keepRoot, cb)
        return // early return!
      } else {
        throw new Error('invalid input type')
      }
      file.path = item[pathSymbol]
      cb(null, file)
    }), (err, files) => {
      if (err) return cb(err)
      files = files.flat()
      cb(null, files, isSingleFileTorrent)
    })
  }
}

const MAX_OUTSTANDING_HASHES = 5

async function getPieceList (files, pieceLength, estimatedTorrentLength, opts, cb) {
  const pieces = []
  let length = 0
  let hashedLength = 0

  const streams = files.map(file => file.getStream)

  const onProgress = opts.onProgress

  let remainingHashes = 0
  let pieceNum = 0
  let ended = false

  const iterator = block_iterator(join_async_iterator(streams), pieceLength, { zeroPadding: false })
  try {
    for await (const chunk of iterator) {
      await new Promise(resolve => {
        length += chunk.length
        const i = pieceNum
        ++pieceNum
        if (++remainingHashes < MAX_OUTSTANDING_HASHES) resolve()
        ;(0,browser/* hash */.vp)(chunk, 'hex').then(hash => {
          pieces[i] = hash
          --remainingHashes
          hashedLength += chunk.length
          if (onProgress) onProgress(hashedLength, estimatedTorrentLength)
          resolve()
          if (ended && remainingHashes === 0) cb(null, (0,browser/* hex2arr */._0)(pieces.join('')), length)
        })
      })
    }
    if (remainingHashes === 0) return cb(null, (0,browser/* hex2arr */._0)(pieces.join('')), length)
    ended = true
  } catch (err) {
    cb(err)
  }
}

function onFiles (files, opts, cb) {
  let _announceList = opts.announceList

  if (!_announceList) {
    if (typeof opts.announce === 'string') _announceList = [[opts.announce]]
    else if (Array.isArray(opts.announce)) {
      _announceList = opts.announce.map(u => [u])
    }
  }

  if (!_announceList) _announceList = []

  if (globalThis.WEBTORRENT_ANNOUNCE) {
    if (typeof globalThis.WEBTORRENT_ANNOUNCE === 'string') {
      _announceList.push([[globalThis.WEBTORRENT_ANNOUNCE]])
    } else if (Array.isArray(globalThis.WEBTORRENT_ANNOUNCE)) {
      _announceList = _announceList.concat(globalThis.WEBTORRENT_ANNOUNCE.map(u => [u]))
    }
  }

  // When no trackers specified, use some reasonable defaults
  if (opts.announce === undefined && opts.announceList === undefined) {
    _announceList = _announceList.concat(announceList)
  }

  if (typeof opts.urlList === 'string') opts.urlList = [opts.urlList]

  const torrent = {
    info: {
      name: opts.name
    },
    'creation date': Math.ceil((Number(opts.creationDate) || Date.now()) / 1000),
    encoding: 'UTF-8'
  }

  if (_announceList.length !== 0) {
    torrent.announce = _announceList[0][0]
    torrent['announce-list'] = _announceList
  }

  if (opts.comment !== undefined) torrent.comment = opts.comment

  if (opts.createdBy !== undefined) torrent['created by'] = opts.createdBy

  if (opts.private !== undefined) torrent.info.private = Number(opts.private)

  if (opts.info !== undefined) Object.assign(torrent.info, opts.info)

  // "ssl-cert" key is for SSL torrents, see:
  //   - http://blog.libtorrent.org/2012/01/bittorrent-over-ssl/
  //   - http://www.libtorrent.org/manual-ref.html#ssl-torrents
  //   - http://www.libtorrent.org/reference-Create_Torrents.html
  if (opts.sslCert !== undefined) torrent.info['ssl-cert'] = opts.sslCert

  if (opts.urlList !== undefined) torrent['url-list'] = opts.urlList

  const estimatedTorrentLength = files.reduce(sumLength, 0)
  const pieceLength = opts.pieceLength || piece_length(estimatedTorrentLength)
  torrent.info['piece length'] = pieceLength

  getPieceList(
    files,
    pieceLength,
    estimatedTorrentLength,
    opts,
    (err, pieces, torrentLength) => {
      if (err) return cb(err)
      torrent.info.pieces = pieces

      files.forEach(file => {
        delete file.getStream
      })

      if (opts.singleFileTorrent) {
        torrent.info.length = torrentLength
      } else {
        torrent.info.files = files
      }

      cb(null, bencode/* default.encode */.Z.encode(torrent))
    }
  )
}

/**
 * Determine if a a file is junk based on its path
 * (defined as hidden OR recognized by the `junk` package)
 *
 * @param  {string} path
 * @return {boolean}
 */
function isJunkPath (path) {
  const filename = path[path.length - 1]
  return filename[0] === '.' && junk.is(filename)
}

/**
 * Accumulator to sum file lengths
 * @param  {number} sum
 * @param  {Object} file
 * @return {number}
 */
function sumLength (sum, file) {
  return sum + file.length
}

/**
 * Check if `obj` is a W3C `Blob` object (which `File` inherits from)
 * @param  {*} obj
 * @return {boolean}
 */
function isBlob (obj) {
  return typeof Blob !== 'undefined' && obj instanceof Blob
}

/**
 * Check if `obj` is a W3C `FileList` object
 * @param  {*} obj
 * @return {boolean}
 */
function isFileList (obj) {
  return typeof FileList !== 'undefined' && obj instanceof FileList
}

/**
 * Check if `obj` is a node Readable stream
 * @param  {*} obj
 * @return {boolean}
 */
function isReadable (obj) {
  return typeof obj === 'object' && obj != null && typeof obj.pipe === 'function'
}

/**
 * Convert a readable stream to a lazy async iterator. Adds instrumentation to track
 * the number of bytes in the stream and set `file.length`.
 *
 * @generator
 * @param  {Stream} readable
 * @param  {Object} file
 * @return {Uint8Array} stream data/chunk
 */
async function * getStreamStream (readable, file) {
  for await (const chunk of readable) {
    file.length += chunk.length
    yield chunk
  }
}

/* harmony default export */ const create_torrent = (createTorrent);


// EXTERNAL MODULE: ./node_modules/debug/src/browser.js
var src_browser = __webpack_require__(1227);
// EXTERNAL MODULE: bittorrent-dht (ignored)
var bittorrent_dht_ignored_ = __webpack_require__(3552);
// EXTERNAL MODULE: load-ip-set (ignored)
var load_ip_set_ignored_ = __webpack_require__(5843);
// EXTERNAL MODULE: fs (ignored)
var fs_ignored_ = __webpack_require__(1982);
;// CONCATENATED MODULE: ./node_modules/cross-fetch-ponyfill/browser.js
const browser_Blob = self.Blob
const File = self.File
const FormData = self.FormData
const Headers = self.Headers
const Request = self.Request
const Response = self.Response
const browser_AbortController = self.AbortController
const browser_AbortSignal = self.AbortSignal

const browser_fetch = self.fetch || (() => { throw new Error('global fetch is not available!') })
/* harmony default export */ const cross_fetch_ponyfill_browser = (browser_fetch);

// EXTERNAL MODULE: ./node_modules/thirty-two/lib/thirty-two/index.js
var thirty_two = __webpack_require__(5017);
;// CONCATENATED MODULE: ./node_modules/bep53-range/index.js
function composeRange (range) {
  return range
    .reduce((acc, cur, idx, arr) => {
      if (idx === 0 || cur !== arr[idx - 1] + 1) acc.push([])
      acc[acc.length - 1].push(cur)
      return acc
    }, [])
    .map((cur) => {
      return cur.length > 1 ? `${cur[0]}-${cur[cur.length - 1]}` : `${cur[0]}`
    })
}

function parseRange (range) {
  const generateRange = (start, end = start) => Array.from({ length: end - start + 1 }, (cur, idx) => idx + start)

  return range
    .reduce((acc, cur, idx, arr) => {
      const r = cur.split('-').map(cur => parseInt(cur))
      return acc.concat(generateRange(...r))
    }, [])
}

/* harmony default export */ const bep53_range = ((/* unused pure expression or super */ null && (parseRange)));



;// CONCATENATED MODULE: ./node_modules/magnet-uri/index.js
/*! magnet-uri. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */




/**
 * Parse a magnet URI and return an object of keys/values
 *
 * @param  {string} uri
 * @return {Object} parsed uri
 */
function magnetURIDecode (uri) {
  const result = {}

  // Support 'magnet:' and 'stream-magnet:' uris
  const data = uri.split('magnet:?')[1]

  const params = (data && data.length >= 0)
    ? data.split('&')
    : []

  params.forEach(param => {
    const keyval = param.split('=')

    // This keyval is invalid, skip it
    if (keyval.length !== 2) return

    const key = keyval[0]
    let val = keyval[1]

    // Clean up torrent name
    if (key === 'dn') val = decodeURIComponent(val).replace(/\+/g, ' ')

    // Address tracker (tr), exact source (xs), and acceptable source (as) are encoded
    // URIs, so decode them
    if (key === 'tr' || key === 'xs' || key === 'as' || key === 'ws') {
      val = decodeURIComponent(val)
    }

    // Return keywords as an array
    if (key === 'kt') val = decodeURIComponent(val).split('+')

    // Cast file index (ix) to a number
    if (key === 'ix') val = Number(val)

    // bep53
    if (key === 'so') val = parseRange(decodeURIComponent(val).split(','))

    // If there are repeated parameters, return an array of values
    if (result[key]) {
      if (!Array.isArray(result[key])) {
        result[key] = [result[key]]
      }

      result[key].push(val)
    } else {
      result[key] = val
    }
  })

  // Convenience properties for parity with `parse-torrent-file` module
  let m
  if (result.xt) {
    const xts = Array.isArray(result.xt) ? result.xt : [result.xt]
    xts.forEach(xt => {
      if ((m = xt.match(/^urn:btih:(.{40})/))) {
        result.infoHash = m[1].toLowerCase()
      } else if ((m = xt.match(/^urn:btih:(.{32})/))) {
        const decodedStr = thirty_two.decode(m[1])
        result.infoHash = (0,browser/* bin2hex */.Ff)(decodedStr)
      } else if ((m = xt.match(/^urn:btmh:1220(.{64})/))) {
        result.infoHashV2 = m[1].toLowerCase()
      }
    })
  }

  if (result.xs) {
    const xss = Array.isArray(result.xs) ? result.xs : [result.xs]
    xss.forEach(xs => {
      if ((m = xs.match(/^urn:btpk:(.{64})/))) {
        result.publicKey = m[1].toLowerCase()
      }
    })
  }

  if (result.infoHash) result.infoHashBuffer = (0,browser/* hex2arr */._0)(result.infoHash)
  if (result.infoHashV2) result.infoHashV2Buffer = (0,browser/* hex2arr */._0)(result.infoHashV2)
  if (result.publicKey) result.publicKeyBuffer = (0,browser/* hex2arr */._0)(result.publicKey)

  if (result.dn) result.name = result.dn
  if (result.kt) result.keywords = result.kt

  result.announce = []
  if (typeof result.tr === 'string' || Array.isArray(result.tr)) {
    result.announce = result.announce.concat(result.tr)
  }

  result.urlList = []
  if (typeof result.as === 'string' || Array.isArray(result.as)) {
    result.urlList = result.urlList.concat(result.as)
  }
  if (typeof result.ws === 'string' || Array.isArray(result.ws)) {
    result.urlList = result.urlList.concat(result.ws)
  }

  result.peerAddresses = []
  if (typeof result['x.pe'] === 'string' || Array.isArray(result['x.pe'])) {
    result.peerAddresses = result.peerAddresses.concat(result['x.pe'])
  }

  // remove duplicates by converting to Set and back
  result.announce = Array.from(new Set(result.announce))
  result.urlList = Array.from(new Set(result.urlList))
  result.peerAddresses = Array.from(new Set(result.peerAddresses))

  return result
}

function magnetURIEncode (obj) {
  obj = Object.assign({}, obj) // clone obj, so we can mutate it

  // support using convenience names, in addition to spec names
  // (example: `infoHash` for `xt`, `name` for `dn`)

  // Deduplicate xt by using a set
  let xts = new Set()
  if (obj.xt && typeof obj.xt === 'string') xts.add(obj.xt)
  if (obj.xt && Array.isArray(obj.xt)) xts = new Set(obj.xt)
  if (obj.infoHashBuffer) xts.add(`urn:btih:${(0,browser/* arr2hex */.oc)(obj.infoHashBuffer)}`)
  if (obj.infoHash) xts.add(`urn:btih:${obj.infoHash}`)
  if (obj.infoHashV2Buffer) xts.add(obj.xt = `urn:btmh:1220${(0,browser/* arr2hex */.oc)(obj.infoHashV2Buffer)}`)
  if (obj.infoHashV2) xts.add(`urn:btmh:1220${obj.infoHashV2}`)
  const xtsDeduped = Array.from(xts)
  if (xtsDeduped.length === 1) obj.xt = xtsDeduped[0]
  if (xtsDeduped.length > 1) obj.xt = xtsDeduped

  if (obj.publicKeyBuffer) obj.xs = `urn:btpk:${(0,browser/* arr2hex */.oc)(obj.publicKeyBuffer)}`
  if (obj.publicKey) obj.xs = `urn:btpk:${obj.publicKey}`
  if (obj.name) obj.dn = obj.name
  if (obj.keywords) obj.kt = obj.keywords
  if (obj.announce) obj.tr = obj.announce
  if (obj.urlList) {
    obj.ws = obj.urlList
    delete obj.as
  }
  if (obj.peerAddresses) obj['x.pe'] = obj.peerAddresses

  let result = 'magnet:?'
  Object.keys(obj)
    .filter(key => key.length === 2 || key === 'x.pe')
    .forEach((key, i) => {
      const values = Array.isArray(obj[key]) ? obj[key] : [obj[key]]
      values.forEach((val, j) => {
        if ((i > 0 || j > 0) && ((key !== 'kt' && key !== 'so') || j === 0)) result += '&'

        if (key === 'dn') val = encodeURIComponent(val).replace(/%20/g, '+')
        if (key === 'tr' || key === 'as' || key === 'ws') {
          val = encodeURIComponent(val)
        }
        // Don't URI encode BEP46 keys
        if (key === 'xs' && !val.startsWith('urn:btpk:')) {
          val = encodeURIComponent(val)
        }
        if (key === 'kt') val = encodeURIComponent(val)
        if (key === 'so') return

        if (key === 'kt' && j > 0) result += `+${val}`
        else result += `${key}=${val}`
      })
      if (key === 'so') result += `${key}=${composeRange(values)}`
    })

  return result
}

/* harmony default export */ const magnet_uri = (magnetURIDecode);


;// CONCATENATED MODULE: ./node_modules/parse-torrent/index.js
/* provided dependency */ var Buffer = __webpack_require__(8764)["Buffer"];
/*! parse-torrent. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */


 // browser exclude






/**
 * Parse a torrent identifier (magnet uri, .torrent file, info hash)
 * @param  {string|ArrayBufferView|Object} torrentId
 * @return {Object}
 */
async function parseTorrent (torrentId) {
  if (typeof torrentId === 'string' && /^(stream-)?magnet:/.test(torrentId)) {
    // if magnet uri (string)
    const torrentObj = magnet_uri(torrentId)

    // infoHash won't be defined if a non-bittorrent magnet is passed
    if (!torrentObj.infoHash) {
      throw new Error('Invalid torrent identifier')
    }

    return torrentObj
  } else if (typeof torrentId === 'string' && (/^[a-f0-9]{40}$/i.test(torrentId) || /^[a-z2-7]{32}$/i.test(torrentId))) {
    // if info hash (hex/base-32 string)
    return magnet_uri(`magnet:?xt=urn:btih:${torrentId}`)
  } else if (ArrayBuffer.isView(torrentId) && torrentId.length === 20) {
    // if info hash (buffer)
    return magnet_uri(`magnet:?xt=urn:btih:${(0,browser/* arr2hex */.oc)(torrentId)}`)
  } else if (ArrayBuffer.isView(torrentId)) {
    // if .torrent file (buffer)
    return await decodeTorrentFile(torrentId) // might throw
  } else if (torrentId && torrentId.infoHash) {
    // if parsed torrent (from `parse-torrent` or `magnet-uri`)
    torrentId.infoHash = torrentId.infoHash.toLowerCase()

    if (!torrentId.announce) torrentId.announce = []

    if (typeof torrentId.announce === 'string') {
      torrentId.announce = [torrentId.announce]
    }

    if (!torrentId.urlList) torrentId.urlList = []

    return torrentId
  } else {
    throw new Error('Invalid torrent identifier')
  }
}

async function parseTorrentRemote (torrentId, opts, cb) {
  if (typeof opts === 'function') return parseTorrentRemote(torrentId, {}, opts)
  if (typeof cb !== 'function') throw new Error('second argument must be a Function')

  let parsedTorrent
  try {
    parsedTorrent = await parseTorrent(torrentId)
  } catch (err) {
    // If torrent fails to parse, it could be a Blob, http/https URL or
    // filesystem path, so don't consider it an error yet.
  }

  if (parsedTorrent && parsedTorrent.infoHash) {
    queue_microtask(() => {
      cb(null, parsedTorrent)
    })
  } else if (parse_torrent_isBlob(torrentId)) {
    try {
      const torrentBuf = new Uint8Array(await torrentId.arrayBuffer())
      parseOrThrow(torrentBuf)
    } catch (err) {
      return cb(new Error(`Error converting Blob: ${err.message}`))
    }
  } else if (/^https?:/.test(torrentId)) {
    try {
      const res = await cross_fetch_ponyfill_browser(torrentId, {
        headers: { 'user-agent': 'WebTorrent (https://webtorrent.io)' },
        signal: AbortSignal.timeout(30 * 1000),
        ...opts
      })
      const torrentBuf = new Uint8Array(await res.arrayBuffer())
      parseOrThrow(torrentBuf)
    } catch (err) {
      return cb(new Error(`Error downloading torrent: ${err.message}`))
    }
  } else if (typeof fs_ignored_.readFile === 'function' && typeof torrentId === 'string') {
    // assume it's a filesystem path
    fs_ignored_.readFile(torrentId, (err, torrentBuf) => {
      if (err) return cb(new Error('Invalid torrent identifier'))
      parseOrThrow(torrentBuf)
    })
  } else {
    queue_microtask(() => {
      cb(new Error('Invalid torrent identifier'))
    })
  }

  async function parseOrThrow (torrentBuf) {
    try {
      parsedTorrent = await parseTorrent(torrentBuf)
    } catch (err) {
      return cb(err)
    }
    if (parsedTorrent && parsedTorrent.infoHash) cb(null, parsedTorrent)
    else cb(new Error('Invalid torrent identifier'))
  }
}

/**
 * Parse a torrent. Throws an exception if the torrent is missing required fields.
 * @param  {ArrayBufferView|Object} torrent
 * @return {Object}        parsed torrent
 */
async function decodeTorrentFile (torrent) {
  if (ArrayBuffer.isView(torrent)) {
    torrent = bencode/* default.decode */.Z.decode(torrent)
  }

  // sanity check
  ensure(torrent.info, 'info')
  ensure(torrent.info['name.utf-8'] || torrent.info.name, 'info.name')
  ensure(torrent.info['piece length'], 'info[\'piece length\']')
  ensure(torrent.info.pieces, 'info.pieces')

  if (torrent.info.files) {
    torrent.info.files.forEach(file => {
      ensure(typeof file.length === 'number', 'info.files[0].length')
      ensure(file['path.utf-8'] || file.path, 'info.files[0].path')
    })
  } else {
    ensure(typeof torrent.info.length === 'number', 'info.length')
  }

  const result = {
    info: torrent.info,
    infoBuffer: bencode/* default.encode */.Z.encode(torrent.info),
    name: (0,browser/* arr2text */.vV)(torrent.info['name.utf-8'] || torrent.info.name),
    announce: []
  }

  result.infoHashBuffer = await (0,browser/* hash */.vp)(result.infoBuffer)
  result.infoHash = (0,browser/* arr2hex */.oc)(result.infoHashBuffer)

  if (torrent.info.private !== undefined) result.private = !!torrent.info.private

  if (torrent['creation date']) result.created = new Date(torrent['creation date'] * 1000)
  if (torrent['created by']) result.createdBy = (0,browser/* arr2text */.vV)(torrent['created by'])

  if (ArrayBuffer.isView(torrent.comment)) result.comment = (0,browser/* arr2text */.vV)(torrent.comment)

  // announce and announce-list will be missing if metadata fetched via ut_metadata
  if (Array.isArray(torrent['announce-list']) && torrent['announce-list'].length > 0) {
    torrent['announce-list'].forEach(urls => {
      urls.forEach(url => {
        result.announce.push((0,browser/* arr2text */.vV)(url))
      })
    })
  } else if (torrent.announce) {
    result.announce.push((0,browser/* arr2text */.vV)(torrent.announce))
  }

  // handle url-list (BEP19 / web seeding)
  if (ArrayBuffer.isView(torrent['url-list'])) {
    // some clients set url-list to empty string
    torrent['url-list'] = torrent['url-list'].length > 0
      ? [torrent['url-list']]
      : []
  }
  result.urlList = (torrent['url-list'] || []).map(url => (0,browser/* arr2text */.vV)(url))

  // remove duplicates by converting to Set and back
  result.announce = Array.from(new Set(result.announce))
  result.urlList = Array.from(new Set(result.urlList))

  const files = torrent.info.files || [torrent.info]
  result.files = files.map((file, i) => {
    const parts = [].concat(result.name, file['path.utf-8'] || file.path || []).map(p => ArrayBuffer.isView(p) ? (0,browser/* arr2text */.vV)(p) : p)
    return {
      path: path_browserify.join.apply(null, [path_browserify.sep].concat(parts)).slice(1),
      name: parts[parts.length - 1],
      length: file.length,
      offset: files.slice(0, i).reduce(parse_torrent_sumLength, 0)
    }
  })

  result.length = files.reduce(parse_torrent_sumLength, 0)

  const lastFile = result.files[result.files.length - 1]

  result.pieceLength = torrent.info['piece length']
  result.lastPieceLength = ((lastFile.offset + lastFile.length) % result.pieceLength) || result.pieceLength
  result.pieces = splitPieces(torrent.info.pieces)

  return result
}

/**
 * Convert a parsed torrent object back into a .torrent file buffer.
 * @param  {Object} parsed parsed torrent
 * @return {Uint8Array}
 */
function encodeTorrentFile (parsed) {
  const torrent = {
    info: parsed.info
  }

  torrent['announce-list'] = (parsed.announce || []).map(url => {
    if (!torrent.announce) torrent.announce = url
    url = (0,browser/* text2arr */.gR)(url)
    return [url]
  })

  torrent['url-list'] = parsed.urlList || []

  if (parsed.private !== undefined) {
    torrent.private = Number(parsed.private)
  }

  if (parsed.created) {
    torrent['creation date'] = (parsed.created.getTime() / 1000) | 0
  }

  if (parsed.createdBy) {
    torrent['created by'] = parsed.createdBy
  }

  if (parsed.comment) {
    torrent.comment = parsed.comment
  }

  return bencode/* default.encode */.Z.encode(torrent)
}

/**
 * Check if `obj` is a W3C `Blob` or `File` object
 * @param  {*} obj
 * @return {boolean}
 */
function parse_torrent_isBlob (obj) {
  return typeof Blob !== 'undefined' && obj instanceof Blob
}

function parse_torrent_sumLength (sum, file) {
  return sum + file.length
}

function splitPieces (buf) {
  const pieces = []
  for (let i = 0; i < buf.length; i += 20) {
    pieces.push((0,browser/* arr2hex */.oc)(buf.slice(i, i + 20)))
  }
  return pieces
}

function ensure (bool, fieldName) {
  if (!bool) throw new Error(`Torrent is missing required field: ${fieldName}`)
}

// Workaround Browserify v13 bug
// https://github.com/substack/node-browserify/issues/1483
;(() => { Buffer.alloc(0) })()

/* harmony default export */ const parse_torrent = (parseTorrent);
const toMagnetURI = magnetURIEncode


// EXTERNAL MODULE: ./node_modules/simple-peer/index.js
var simple_peer = __webpack_require__(8853);
// EXTERNAL MODULE: ./node_modules/randombytes/browser.js
var randombytes_browser = __webpack_require__(1798);
// EXTERNAL MODULE: ./node_modules/throughput/index.js
var throughput = __webpack_require__(1463);
// EXTERNAL MODULE: ./node_modules/speed-limiter/index.js
var speed_limiter = __webpack_require__(558);
// EXTERNAL MODULE: ./lib/conn-pool.js (ignored)
var conn_pool_ignored_ = __webpack_require__(8302);
// EXTERNAL MODULE: fs (ignored)
var fs_ignored_0 = __webpack_require__(2203);
// EXTERNAL MODULE: net (ignored)
var net_ignored_ = __webpack_require__(1494);
// EXTERNAL MODULE: os (ignored)
var os_ignored_ = __webpack_require__(5381);
;// CONCATENATED MODULE: ./node_modules/addr-to-ip-port/index.js
const ADDR_RE = /^\[?([^\]]+)]?:(\d+)$/ // ipv4/ipv6/hostname + port

let cache = new Map()

// reset cache when it gets to 100,000 elements (~ 600KB of ipv4 addresses)
// so it will not grow to consume all memory in long-running processes
function addrToIPPort (addr) {
  if (cache.size === 100000) cache.clear()
  if (!cache.has(addr)) {
    const m = ADDR_RE.exec(addr)
    if (!m) throw new Error(`invalid addr: ${addr}`)
    cache.set(addr, [ m[1], Number(m[2]) ])
  }
  return cache.get(addr)
}

// EXTERNAL MODULE: ./node_modules/bitfield/lib/esm/index.js
var esm = __webpack_require__(8205);
// EXTERNAL MODULE: ./node_modules/cache-chunk-store/index.js
var cache_chunk_store = __webpack_require__(9421);
;// CONCATENATED MODULE: ./node_modules/chunk-store-iterator/index.js


async function * chunkStoreRead (store, opts = {}) {
  if (store?.[Symbol.asyncIterator]) {
    yield * store[Symbol.asyncIterator](opts.offset)
    return
  }
  if (!store?.get) throw new Error('First argument must be an abstract-chunk-store compliant store')

  const chunkLength = opts.chunkLength || store.chunkLength
  if (!chunkLength) throw new Error('missing required `chunkLength` property')

  let length = opts.length || store.length
  if (!Number.isFinite(length)) throw new Error('missing required `length` property')

  const offset = opts.offset || 0

  const get = (i, length, offset) => new Promise((resolve, reject) => {
    store.get(i, { offset, length }, (err, chunk) => {
      if (err) reject(err)
      resolve(chunk)
    })
  })

  let index = Math.floor(offset / chunkLength)
  const chunkOffset = offset % chunkLength
  if (offset) {
    const target = Math.min(length, chunkLength - chunkOffset)
    length -= target
    yield get(index++, target, chunkOffset)
  }

  for (let remainingLength = length; remainingLength > 0; ++index, remainingLength -= chunkLength) {
    yield get(index, Math.min(remainingLength, chunkLength))
  }
}

async function chunkStoreWrite (store, stream, opts = {}) {
  if (!store?.put) throw new Error('First argument must be an abstract-chunk-store compliant store')

  const chunkLength = opts.chunkLength || store.chunkLength
  if (!chunkLength) throw new Error('missing required `chunkLength` property')

  const storeMaxOutstandingPuts = opts.storeMaxOutstandingPuts || 16
  let outstandingPuts = 0

  let index = 0

  let cb = () => {}
  let ended = false

  for await (const chunk of block_iterator(stream, chunkLength, { zeroPadding: opts.zeroPadding || false })) {
    await new Promise(resolve => {
      if (outstandingPuts++ <= storeMaxOutstandingPuts) resolve()
      store.put(index++, chunk, err => {
        if (err) throw err
        --outstandingPuts
        resolve()
        if (ended && outstandingPuts === 0) cb()
      })
    })
  }
  if (outstandingPuts === 0) return
  ended = new Promise(resolve => { cb = resolve })
  await ended
}


/* harmony default export */ const chunk_store_iterator = ({ chunkStoreRead, chunkStoreWrite });

// EXTERNAL MODULE: ./node_modules/cpus/browser.js
var cpus_browser = __webpack_require__(9648);
// EXTERNAL MODULE: bittorrent-dht (ignored)
var bittorrent_dht_ignored_0 = __webpack_require__(1018);
// EXTERNAL MODULE: ./node_modules/once/once.js
var once = __webpack_require__(778);
// EXTERNAL MODULE: ./common-node.js (ignored)
var common_node_ignored_ = __webpack_require__(8411);
var common_node_ignored_namespaceObject = /*#__PURE__*/__webpack_require__.t(common_node_ignored_, 2);
;// CONCATENATED MODULE: ./node_modules/bittorrent-tracker/lib/common.js
/* provided dependency */ var common_Buffer = __webpack_require__(8764)["Buffer"];
/**
 * Functions/constants needed by both the client and server.
 */


const DEFAULT_ANNOUNCE_PEERS = 50
const MAX_ANNOUNCE_PEERS = 82

const binaryToHex = str => {
  if (typeof str !== 'string') {
    str = String(str)
  }
  return common_Buffer.from(str, 'binary').toString('hex')
}

const hexToBinary = str => {
  if (typeof str !== 'string') {
    str = String(str)
  }
  return common_Buffer.from(str, 'hex').toString('binary')
}

// HACK: Fix for WHATWG URL object not parsing non-standard URL schemes like
// 'udp:'. Just replace it with 'http:' since we only need a few properties.
//
// Note: Only affects Chrome and Firefox. Works fine in Node.js, Safari, and
// Edge.
//
// Note: UDP trackers aren't used in the normal browser build, but they are
// used in a Chrome App build (i.e. by Brave Browser).
//
// Bug reports:
// - Chrome: https://bugs.chromium.org/p/chromium/issues/detail?id=734880
// - Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1374505
const parseUrl = str => {
  const url = new URL(str.replace(/^udp:/, 'http:'))

  if (str.match(/^udp:/)) {
    Object.defineProperties(url, {
      href: { value: url.href.replace(/^http/, 'udp') },
      protocol: { value: url.protocol.replace(/^http/, 'udp') },
      origin: { value: url.origin.replace(/^http/, 'udp') }
    })
  }

  return url
}

/* harmony default export */ const common = ({
  DEFAULT_ANNOUNCE_PEERS,
  MAX_ANNOUNCE_PEERS,
  binaryToHex,
  hexToBinary,
  parseUrl,
  ...common_node_ignored_namespaceObject
});

// EXTERNAL MODULE: ./lib/client/http-tracker.js (ignored)
var http_tracker_ignored_ = __webpack_require__(1857);
// EXTERNAL MODULE: ./lib/client/udp-tracker.js (ignored)
var udp_tracker_ignored_ = __webpack_require__(159);
// EXTERNAL MODULE: ./node_modules/clone/clone.js
var clone = __webpack_require__(6313);
// EXTERNAL MODULE: ./node_modules/simple-websocket/index.js
var simple_websocket = __webpack_require__(522);
// EXTERNAL MODULE: socks (ignored)
var socks_ignored_ = __webpack_require__(9354);
;// CONCATENATED MODULE: ./node_modules/bittorrent-tracker/lib/client/tracker.js


class Tracker extends events {
  constructor (client, announceUrl) {
    super()

    this.client = client
    this.announceUrl = announceUrl

    this.interval = null
    this.destroyed = false
  }

  setInterval (intervalMs) {
    if (intervalMs == null) intervalMs = this.DEFAULT_ANNOUNCE_INTERVAL

    clearInterval(this.interval)

    if (intervalMs) {
      this.interval = setInterval(() => {
        this.announce(this.client._defaultAnnounceOpts())
      }, intervalMs)
      if (this.interval.unref) this.interval.unref()
    }
  }
}

/* harmony default export */ const tracker = (Tracker);

;// CONCATENATED MODULE: ./node_modules/bittorrent-tracker/lib/client/websocket-tracker.js










const debug = src_browser('bittorrent-tracker:websocket-tracker')

// Use a socket pool, so tracker clients share WebSocket objects for the same server.
// In practice, WebSockets are pretty slow to establish, so this gives a nice performance
// boost, and saves browser resources.
const socketPool = {}

const RECONNECT_MINIMUM = 10 * 1000
const RECONNECT_MAXIMUM = 60 * 60 * 1000
const RECONNECT_VARIANCE = 5 * 60 * 1000
const OFFER_TIMEOUT = 50 * 1000

class WebSocketTracker extends tracker {
  constructor (client, announceUrl) {
    super(client, announceUrl)
    debug('new websocket tracker %s', announceUrl)

    this.peers = {} // peers (offer id -> peer)
    this.socket = null

    this.reconnecting = false
    this.retries = 0
    this.reconnectTimer = null

    // Simple boolean flag to track whether the socket has received data from
    // the websocket server since the last time socket.send() was called.
    this.expectingResponse = false

    this._openSocket()
  }

  announce (opts) {
    if (this.destroyed || this.reconnecting) return
    if (!this.socket.connected) {
      this.socket.once('connect', () => {
        this.announce(opts)
      })
      return
    }

    const params = Object.assign({}, opts, {
      action: 'announce',
      info_hash: this.client._infoHashBinary,
      peer_id: this.client._peerIdBinary
    })
    if (this._trackerId) params.trackerid = this._trackerId

    if (opts.event === 'stopped' || opts.event === 'completed') {
      // Don't include offers with 'stopped' or 'completed' event
      this._send(params)
    } else {
      // Limit the number of offers that are generated, since it can be slow
      const numwant = Math.min(opts.numwant, 5)

      this._generateOffers(numwant, offers => {
        params.numwant = numwant
        params.offers = offers
        this._send(params)
      })
    }
  }

  scrape (opts) {
    if (this.destroyed || this.reconnecting) return
    if (!this.socket.connected) {
      this.socket.once('connect', () => {
        this.scrape(opts)
      })
      return
    }

    const infoHashes = (Array.isArray(opts.infoHash) && opts.infoHash.length > 0)
      ? opts.infoHash.map(infoHash => infoHash.toString('binary'))
      : (opts.infoHash && opts.infoHash.toString('binary')) || this.client._infoHashBinary
    const params = {
      action: 'scrape',
      info_hash: infoHashes
    }

    this._send(params)
  }

  destroy (cb = noop) {
    if (this.destroyed) return cb(null)

    this.destroyed = true

    clearInterval(this.interval)
    clearTimeout(this.reconnectTimer)

    // Destroy peers
    for (const peerId in this.peers) {
      const peer = this.peers[peerId]
      clearTimeout(peer.trackerTimeout)
      peer.destroy()
    }
    this.peers = null

    if (this.socket) {
      this.socket.removeListener('connect', this._onSocketConnectBound)
      this.socket.removeListener('data', this._onSocketDataBound)
      this.socket.removeListener('close', this._onSocketCloseBound)
      this.socket.removeListener('error', this._onSocketErrorBound)
      this.socket = null
    }

    this._onSocketConnectBound = null
    this._onSocketErrorBound = null
    this._onSocketDataBound = null
    this._onSocketCloseBound = null

    if (socketPool[this.announceUrl]) {
      socketPool[this.announceUrl].consumers -= 1
    }

    // Other instances are using the socket, so there's nothing left to do here
    if (socketPool[this.announceUrl].consumers > 0) return cb()

    let socket = socketPool[this.announceUrl]
    delete socketPool[this.announceUrl]
    socket.on('error', noop) // ignore all future errors
    socket.once('close', cb)

    let timeout

    // If there is no data response expected, destroy immediately.
    if (!this.expectingResponse) return destroyCleanup()

    // Otherwise, wait a short time for potential responses to come in from the
    // server, then force close the socket.
    timeout = setTimeout(destroyCleanup, common.DESTROY_TIMEOUT)

    // But, if a response comes from the server before the timeout fires, do cleanup
    // right away.
    socket.once('data', destroyCleanup)

    function destroyCleanup () {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      socket.removeListener('data', destroyCleanup)
      socket.destroy()
      socket = null
    }
  }

  _openSocket () {
    this.destroyed = false

    if (!this.peers) this.peers = {}

    this._onSocketConnectBound = () => {
      this._onSocketConnect()
    }
    this._onSocketErrorBound = err => {
      this._onSocketError(err)
    }
    this._onSocketDataBound = data => {
      this._onSocketData(data)
    }
    this._onSocketCloseBound = () => {
      this._onSocketClose()
    }

    this.socket = socketPool[this.announceUrl]
    if (this.socket) {
      socketPool[this.announceUrl].consumers += 1
      if (this.socket.connected) {
        this._onSocketConnectBound()
      }
    } else {
      const parsedUrl = new URL(this.announceUrl)
      let agent
      if (this.client._proxyOpts) {
        agent = parsedUrl.protocol === 'wss:' ? this.client._proxyOpts.httpsAgent : this.client._proxyOpts.httpAgent
        if (!agent && this.client._proxyOpts.socksProxy) {
          agent = new socks_ignored_.Agent(clone(this.client._proxyOpts.socksProxy), (parsedUrl.protocol === 'wss:'))
        }
      }
      this.socket = socketPool[this.announceUrl] = new simple_websocket({ url: this.announceUrl, agent })
      this.socket.consumers = 1
      this.socket.once('connect', this._onSocketConnectBound)
    }

    this.socket.on('data', this._onSocketDataBound)
    this.socket.once('close', this._onSocketCloseBound)
    this.socket.once('error', this._onSocketErrorBound)
  }

  _onSocketConnect () {
    if (this.destroyed) return

    if (this.reconnecting) {
      this.reconnecting = false
      this.retries = 0
      this.announce(this.client._defaultAnnounceOpts())
    }
  }

  _onSocketData (data) {
    if (this.destroyed) return

    this.expectingResponse = false

    try {
      data = JSON.parse(data)
    } catch (err) {
      this.client.emit('warning', new Error('Invalid tracker response'))
      return
    }

    if (data.action === 'announce') {
      this._onAnnounceResponse(data)
    } else if (data.action === 'scrape') {
      this._onScrapeResponse(data)
    } else {
      this._onSocketError(new Error(`invalid action in WS response: ${data.action}`))
    }
  }

  _onAnnounceResponse (data) {
    if (data.info_hash !== this.client._infoHashBinary) {
      debug(
        'ignoring websocket data from %s for %s (looking for %s: reused socket)',
        this.announceUrl, common.binaryToHex(data.info_hash), this.client.infoHash
      )
      return
    }

    if (data.peer_id && data.peer_id === this.client._peerIdBinary) {
      // ignore offers/answers from this client
      return
    }

    debug(
      'received %s from %s for %s',
      JSON.stringify(data), this.announceUrl, this.client.infoHash
    )

    const failure = data['failure reason']
    if (failure) return this.client.emit('warning', new Error(failure))

    const warning = data['warning message']
    if (warning) this.client.emit('warning', new Error(warning))

    const interval = data.interval || data['min interval']
    if (interval) this.setInterval(interval * 1000)

    const trackerId = data['tracker id']
    if (trackerId) {
      // If absent, do not discard previous trackerId value
      this._trackerId = trackerId
    }

    if (data.complete != null) {
      const response = Object.assign({}, data, {
        announce: this.announceUrl,
        infoHash: common.binaryToHex(data.info_hash)
      })
      this.client.emit('update', response)
    }

    let peer
    if (data.offer && data.peer_id) {
      debug('creating peer (from remote offer)')
      peer = this._createPeer()
      peer.id = common.binaryToHex(data.peer_id)
      peer.once('signal', answer => {
        const params = {
          action: 'announce',
          info_hash: this.client._infoHashBinary,
          peer_id: this.client._peerIdBinary,
          to_peer_id: data.peer_id,
          answer,
          offer_id: data.offer_id
        }
        if (this._trackerId) params.trackerid = this._trackerId
        this._send(params)
      })
      this.client.emit('peer', peer)
      peer.signal(data.offer)
    }

    if (data.answer && data.peer_id) {
      const offerId = common.binaryToHex(data.offer_id)
      peer = this.peers[offerId]
      if (peer) {
        peer.id = common.binaryToHex(data.peer_id)
        this.client.emit('peer', peer)
        peer.signal(data.answer)

        clearTimeout(peer.trackerTimeout)
        peer.trackerTimeout = null
        delete this.peers[offerId]
      } else {
        debug(`got unexpected answer: ${JSON.stringify(data.answer)}`)
      }
    }
  }

  _onScrapeResponse (data) {
    data = data.files || {}

    const keys = Object.keys(data)
    if (keys.length === 0) {
      this.client.emit('warning', new Error('invalid scrape response'))
      return
    }

    keys.forEach(infoHash => {
      // TODO: optionally handle data.flags.min_request_interval
      // (separate from announce interval)
      const response = Object.assign(data[infoHash], {
        announce: this.announceUrl,
        infoHash: common.binaryToHex(infoHash)
      })
      this.client.emit('scrape', response)
    })
  }

  _onSocketClose () {
    if (this.destroyed) return
    this.destroy()
    this._startReconnectTimer()
  }

  _onSocketError (err) {
    if (this.destroyed) return
    this.destroy()
    // errors will often happen if a tracker is offline, so don't treat it as fatal
    this.client.emit('warning', err)
    this._startReconnectTimer()
  }

  _startReconnectTimer () {
    const ms = Math.floor(Math.random() * RECONNECT_VARIANCE) + Math.min(Math.pow(2, this.retries) * RECONNECT_MINIMUM, RECONNECT_MAXIMUM)

    this.reconnecting = true
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.retries++
      this._openSocket()
    }, ms)
    if (this.reconnectTimer.unref) this.reconnectTimer.unref()

    debug('reconnecting socket in %s ms', ms)
  }

  _send (params) {
    if (this.destroyed) return
    this.expectingResponse = true
    const message = JSON.stringify(params)
    debug('send %s', message)
    this.socket.send(message)
  }

  _generateOffers (numwant, cb) {
    const self = this
    const offers = []
    debug('generating %s offers', numwant)

    for (let i = 0; i < numwant; ++i) {
      generateOffer()
    }
    checkDone()

    function generateOffer () {
      const offerId = randombytes_browser(20).toString('hex')
      debug('creating peer (from _generateOffers)')
      const peer = self.peers[offerId] = self._createPeer({ initiator: true })
      peer.once('signal', offer => {
        offers.push({
          offer,
          offer_id: common.hexToBinary(offerId)
        })
        checkDone()
      })
      peer.trackerTimeout = setTimeout(() => {
        debug('tracker timeout: destroying peer')
        peer.trackerTimeout = null
        delete self.peers[offerId]
        peer.destroy()
      }, OFFER_TIMEOUT)
      if (peer.trackerTimeout.unref) peer.trackerTimeout.unref()
    }

    function checkDone () {
      if (offers.length === numwant) {
        debug('generated %s offers', numwant)
        cb(offers)
      }
    }
  }

  _createPeer (opts) {
    const self = this

    opts = Object.assign({
      trickle: false,
      config: self.client._rtcConfig,
      wrtc: self.client._wrtc
    }, opts)

    const peer = new simple_peer(opts)

    peer.once('error', onError)
    peer.once('connect', onConnect)

    return peer

    // Handle peer 'error' events that are fired *before* the peer is emitted in
    // a 'peer' event.
    function onError (err) {
      self.client.emit('warning', new Error(`Connection error: ${err.message}`))
      peer.destroy()
    }

    // Once the peer is emitted in a 'peer' event, then it's the consumer's
    // responsibility to listen for errors, so the listeners are removed here.
    function onConnect () {
      peer.removeListener('error', onError)
      peer.removeListener('connect', onConnect)
    }
  }
}

WebSocketTracker.prototype.DEFAULT_ANNOUNCE_INTERVAL = 30 * 1000 // 30 seconds
// Normally this shouldn't be accessed but is occasionally useful
WebSocketTracker._socketPool = socketPool

function noop () {}

/* harmony default export */ const websocket_tracker = (WebSocketTracker);

;// CONCATENATED MODULE: ./node_modules/bittorrent-tracker/client.js
/* provided dependency */ var process = __webpack_require__(8768);
/* provided dependency */ var client_Buffer = __webpack_require__(8764)["Buffer"];








 // empty object in browser
 // empty object in browser


const client_debug = src_browser('bittorrent-tracker:client')

/**
 * BitTorrent tracker client.
 *
 * Find torrent peers, to help a torrent client participate in a torrent swarm.
 *
 * @param {Object} opts                          options object
 * @param {string|Buffer} opts.infoHash          torrent info hash
 * @param {string|Buffer} opts.peerId            peer id
 * @param {string|Array.<string>} opts.announce  announce
 * @param {number} opts.port                     torrent client listening port
 * @param {function} opts.getAnnounceOpts        callback to provide data to tracker
 * @param {number} opts.rtcConfig                RTCPeerConnection configuration object
 * @param {number} opts.userAgent                User-Agent header for http requests
 * @param {number} opts.wrtc                     custom webrtc impl (useful in node.js)
 * @param {object} opts.proxyOpts                proxy options (useful in node.js)
 */
class client_Client extends events {
  constructor (opts = {}) {
    super()

    if (!opts.peerId) throw new Error('Option `peerId` is required')
    if (!opts.infoHash) throw new Error('Option `infoHash` is required')
    if (!opts.announce) throw new Error('Option `announce` is required')
    if (!process.browser && !opts.port) throw new Error('Option `port` is required')

    this.peerId = typeof opts.peerId === 'string'
      ? opts.peerId
      : opts.peerId.toString('hex')
    this._peerIdBuffer = client_Buffer.from(this.peerId, 'hex')
    this._peerIdBinary = this._peerIdBuffer.toString('binary')

    this.infoHash = typeof opts.infoHash === 'string'
      ? opts.infoHash.toLowerCase()
      : opts.infoHash.toString('hex')
    this._infoHashBuffer = client_Buffer.from(this.infoHash, 'hex')
    this._infoHashBinary = this._infoHashBuffer.toString('binary')

    client_debug('new client %s', this.infoHash)

    this.destroyed = false

    this._port = opts.port
    this._getAnnounceOpts = opts.getAnnounceOpts
    this._rtcConfig = opts.rtcConfig
    this._userAgent = opts.userAgent
    this._proxyOpts = opts.proxyOpts

    // Support lazy 'wrtc' module initialization
    // See: https://github.com/webtorrent/webtorrent-hybrid/issues/46
    this._wrtc = typeof opts.wrtc === 'function' ? opts.wrtc() : opts.wrtc

    let announce = typeof opts.announce === 'string'
      ? [opts.announce]
      : opts.announce == null ? [] : opts.announce

    // Remove trailing slash from trackers to catch duplicates
    announce = announce.map(announceUrl => {
      announceUrl = announceUrl.toString()
      if (announceUrl[announceUrl.length - 1] === '/') {
        announceUrl = announceUrl.substring(0, announceUrl.length - 1)
      }
      return announceUrl
    })
    // remove duplicates by converting to Set and back
    announce = Array.from(new Set(announce))

    const webrtcSupport = this._wrtc !== false && (!!this._wrtc || simple_peer.WEBRTC_SUPPORT)

    const nextTickWarn = err => {
      queue_microtask(() => {
        this.emit('warning', err)
      })
    }

    this._trackers = announce
      .map(announceUrl => {
        let parsedUrl
        try {
          parsedUrl = common.parseUrl(announceUrl)
        } catch (err) {
          nextTickWarn(new Error(`Invalid tracker URL: ${announceUrl}`))
          return null
        }

        const port = parsedUrl.port
        if (port < 0 || port > 65535) {
          nextTickWarn(new Error(`Invalid tracker port: ${announceUrl}`))
          return null
        }

        const protocol = parsedUrl.protocol
        if ((protocol === 'http:' || protocol === 'https:') &&
            typeof http_tracker_ignored_ === 'function') {
          return new http_tracker_ignored_(this, announceUrl)
        } else if (protocol === 'udp:' && typeof udp_tracker_ignored_ === 'function') {
          return new udp_tracker_ignored_(this, announceUrl)
        } else if ((protocol === 'ws:' || protocol === 'wss:') && webrtcSupport) {
          // Skip ws:// trackers on https:// sites because they throw SecurityError
          if (protocol === 'ws:' && typeof window !== 'undefined' &&
              window.location.protocol === 'https:') {
            nextTickWarn(new Error(`Unsupported tracker protocol: ${announceUrl}`))
            return null
          }
          return new websocket_tracker(this, announceUrl)
        } else {
          nextTickWarn(new Error(`Unsupported tracker protocol: ${announceUrl}`))
          return null
        }
      })
      .filter(Boolean)
  }

  /**
   * Send a `start` announce to the trackers.
   * @param {Object} opts
   * @param {number=} opts.uploaded
   * @param {number=} opts.downloaded
   * @param {number=} opts.left (if not set, calculated automatically)
   */
  start (opts) {
    opts = this._defaultAnnounceOpts(opts)
    opts.event = 'started'
    client_debug('send `start` %o', opts)
    this._announce(opts)

    // start announcing on intervals
    this._trackers.forEach(tracker => {
      tracker.setInterval()
    })
  }

  /**
   * Send a `stop` announce to the trackers.
   * @param {Object} opts
   * @param {number=} opts.uploaded
   * @param {number=} opts.downloaded
   * @param {number=} opts.numwant
   * @param {number=} opts.left (if not set, calculated automatically)
   */
  stop (opts) {
    opts = this._defaultAnnounceOpts(opts)
    opts.event = 'stopped'
    client_debug('send `stop` %o', opts)
    this._announce(opts)
  }

  /**
   * Send a `complete` announce to the trackers.
   * @param {Object} opts
   * @param {number=} opts.uploaded
   * @param {number=} opts.downloaded
   * @param {number=} opts.numwant
   * @param {number=} opts.left (if not set, calculated automatically)
   */
  complete (opts) {
    if (!opts) opts = {}
    opts = this._defaultAnnounceOpts(opts)
    opts.event = 'completed'
    client_debug('send `complete` %o', opts)
    this._announce(opts)
  }

  /**
   * Send a `update` announce to the trackers.
   * @param {Object} opts
   * @param {number=} opts.uploaded
   * @param {number=} opts.downloaded
   * @param {number=} opts.numwant
   * @param {number=} opts.left (if not set, calculated automatically)
   */
  update (opts) {
    opts = this._defaultAnnounceOpts(opts)
    if (opts.event) delete opts.event
    client_debug('send `update` %o', opts)
    this._announce(opts)
  }

  _announce (opts) {
    this._trackers.forEach(tracker => {
      // tracker should not modify `opts` object, it's passed to all trackers
      tracker.announce(opts)
    })
  }

  /**
   * Send a scrape request to the trackers.
   * @param {Object} opts
   */
  scrape (opts) {
    client_debug('send `scrape`')
    if (!opts) opts = {}
    this._trackers.forEach(tracker => {
      // tracker should not modify `opts` object, it's passed to all trackers
      tracker.scrape(opts)
    })
  }

  setInterval (intervalMs) {
    client_debug('setInterval %d', intervalMs)
    this._trackers.forEach(tracker => {
      tracker.setInterval(intervalMs)
    })
  }

  destroy (cb) {
    if (this.destroyed) return
    this.destroyed = true
    client_debug('destroy')

    const tasks = this._trackers.map(tracker => cb => {
      tracker.destroy(cb)
    })

    run_parallel(tasks, cb)

    this._trackers = []
    this._getAnnounceOpts = null
  }

  _defaultAnnounceOpts (opts = {}) {
    if (opts.numwant == null) opts.numwant = common.DEFAULT_ANNOUNCE_PEERS

    if (opts.uploaded == null) opts.uploaded = 0
    if (opts.downloaded == null) opts.downloaded = 0

    if (this._getAnnounceOpts) opts = Object.assign({}, opts, this._getAnnounceOpts())

    return opts
  }
}

/**
 * Simple convenience function to scrape a tracker for an info hash without needing to
 * create a Client, pass it a parsed torrent, etc. Support scraping a tracker for multiple
 * torrents at the same time.
 * @params {Object} opts
 * @param  {string|Array.<string>} opts.infoHash
 * @param  {string} opts.announce
 * @param  {function} cb
 */
client_Client.scrape = (opts, cb) => {
  cb = once(cb)

  if (!opts.infoHash) throw new Error('Option `infoHash` is required')
  if (!opts.announce) throw new Error('Option `announce` is required')

  const clientOpts = Object.assign({}, opts, {
    infoHash: Array.isArray(opts.infoHash) ? opts.infoHash[0] : opts.infoHash,
    peerId: client_Buffer.from('01234567890123456789'), // dummy value
    port: 6881 // dummy value
  })

  const client = new client_Client(clientOpts)
  client.once('error', cb)
  client.once('warning', cb)

  let len = Array.isArray(opts.infoHash) ? opts.infoHash.length : 1
  const results = {}
  client.on('scrape', data => {
    len -= 1
    results[data.infoHash] = data
    if (len === 0) {
      client.destroy()
      const keys = Object.keys(results)
      if (keys.length === 1) {
        cb(null, results[keys[0]])
      } else {
        cb(null, results)
      }
    }
  })

  opts.infoHash = Array.isArray(opts.infoHash)
    ? opts.infoHash.map(infoHash => client_Buffer.from(infoHash, 'hex'))
    : client_Buffer.from(opts.infoHash, 'hex')
  client.scrape({ infoHash: opts.infoHash })
  return client
}

/* harmony default export */ const client = (client_Client);

// EXTERNAL MODULE: ./server.js (ignored)
var server_ignored_ = __webpack_require__(859);
;// CONCATENATED MODULE: ./node_modules/bittorrent-tracker/index.js
/*! bittorrent-tracker. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */



/* harmony default export */ const bittorrent_tracker = ((/* unused pure expression or super */ null && (Client)));


// EXTERNAL MODULE: bittorrent-lsd (ignored)
var bittorrent_lsd_ignored_ = __webpack_require__(2067);
;// CONCATENATED MODULE: ./node_modules/torrent-discovery/index.js
/* provided dependency */ var torrent_discovery_process = __webpack_require__(8768);
/*! torrent-discovery. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */

 // empty object in browser





const torrent_discovery_debug = src_browser('torrent-discovery')

class Discovery extends events.EventEmitter {
  constructor (opts) {
    super()

    if (!opts.peerId) throw new Error('Option `peerId` is required')
    if (!opts.infoHash) throw new Error('Option `infoHash` is required')
    if (!torrent_discovery_process.browser && !opts.port) throw new Error('Option `port` is required')

    this.peerId = typeof opts.peerId === 'string'
      ? opts.peerId
      : opts.peerId.toString('hex')
    this.infoHash = typeof opts.infoHash === 'string'
      ? opts.infoHash.toLowerCase()
      : opts.infoHash.toString('hex')
    this._port = opts.port // torrent port
    this._userAgent = opts.userAgent // User-Agent header for http requests

    this.destroyed = false

    this._announce = opts.announce || []
    this._intervalMs = opts.intervalMs || (15 * 60 * 1000)
    this._trackerOpts = null
    this._dhtAnnouncing = false
    this._dhtTimeout = false
    this._internalDHT = false // is the DHT created internally?

    this._onWarning = err => {
      this.emit('warning', err)
    }
    this._onError = err => {
      this.emit('error', err)
    }
    this._onDHTPeer = (peer, infoHash) => {
      if (infoHash.toString('hex') !== this.infoHash) return
      this.emit('peer', `${peer.host}:${peer.port}`, 'dht')
    }
    this._onTrackerPeer = peer => {
      this.emit('peer', peer, 'tracker')
    }
    this._onTrackerAnnounce = () => {
      this.emit('trackerAnnounce')
    }
    this._onLSDPeer = (peer, infoHash) => {
      this.emit('peer', peer, 'lsd')
    }

    const createDHT = (port, opts) => {
      const dht = new bittorrent_dht_ignored_0.Client(opts)
      dht.on('warning', this._onWarning)
      dht.on('error', this._onError)
      dht.listen(port)
      this._internalDHT = true
      return dht
    }

    if (opts.tracker === false) {
      this.tracker = null
    } else if (opts.tracker && typeof opts.tracker === 'object') {
      this._trackerOpts = Object.assign({}, opts.tracker)
      this.tracker = this._createTracker()
    } else {
      this.tracker = this._createTracker()
    }

    if (opts.dht === false || typeof bittorrent_dht_ignored_0.Client !== 'function') {
      this.dht = null
    } else if (opts.dht && typeof opts.dht.addNode === 'function') {
      this.dht = opts.dht
    } else if (opts.dht && typeof opts.dht === 'object') {
      this.dht = createDHT(opts.dhtPort, opts.dht)
    } else {
      this.dht = createDHT(opts.dhtPort)
    }

    if (this.dht) {
      this.dht.on('peer', this._onDHTPeer)
      this._dhtAnnounce()
    }

    if (opts.lsd === false || typeof bittorrent_lsd_ignored_ !== 'function') {
      this.lsd = null
    } else {
      this.lsd = this._createLSD()
    }
  }

  updatePort (port) {
    if (port === this._port) return
    this._port = port

    if (this.dht) this._dhtAnnounce()

    if (this.tracker) {
      this.tracker.stop()
      this.tracker.destroy(() => {
        this.tracker = this._createTracker()
      })
    }
  }

  complete (opts) {
    if (this.tracker) {
      this.tracker.complete(opts)
    }
  }

  destroy (cb) {
    if (this.destroyed) return
    this.destroyed = true

    clearTimeout(this._dhtTimeout)

    const tasks = []

    if (this.tracker) {
      this.tracker.stop()
      this.tracker.removeListener('warning', this._onWarning)
      this.tracker.removeListener('error', this._onError)
      this.tracker.removeListener('peer', this._onTrackerPeer)
      this.tracker.removeListener('update', this._onTrackerAnnounce)
      tasks.push(cb => {
        this.tracker.destroy(cb)
      })
    }

    if (this.dht) {
      this.dht.removeListener('peer', this._onDHTPeer)
    }

    if (this._internalDHT) {
      this.dht.removeListener('warning', this._onWarning)
      this.dht.removeListener('error', this._onError)
      tasks.push(cb => {
        this.dht.destroy(cb)
      })
    }

    if (this.lsd) {
      this.lsd.removeListener('warning', this._onWarning)
      this.lsd.removeListener('error', this._onError)
      this.lsd.removeListener('peer', this._onLSDPeer)
      tasks.push(cb => {
        this.lsd.destroy(cb)
      })
    }

    run_parallel(tasks, cb)

    // cleanup
    this.dht = null
    this.tracker = null
    this.lsd = null
    this._announce = null
  }

  _createTracker () {
    const opts = Object.assign({}, this._trackerOpts, {
      infoHash: this.infoHash,
      announce: this._announce,
      peerId: this.peerId,
      port: this._port,
      userAgent: this._userAgent
    })

    const tracker = new client(opts)
    tracker.on('warning', this._onWarning)
    tracker.on('error', this._onError)
    tracker.on('peer', this._onTrackerPeer)
    tracker.on('update', this._onTrackerAnnounce)
    tracker.setInterval(this._intervalMs)
    tracker.start()
    return tracker
  }

  _dhtAnnounce () {
    if (this._dhtAnnouncing) return
    torrent_discovery_debug('dht announce')

    this._dhtAnnouncing = true
    clearTimeout(this._dhtTimeout)

    this.dht.announce(this.infoHash, this._port, err => {
      this._dhtAnnouncing = false
      torrent_discovery_debug('dht announce complete')

      if (err) this.emit('warning', err)
      this.emit('dhtAnnounce')

      if (!this.destroyed) {
        this._dhtTimeout = setTimeout(() => {
          this._dhtAnnounce()
        }, this._intervalMs + Math.floor(Math.random() * this._intervalMs / 5))
        if (this._dhtTimeout.unref) this._dhtTimeout.unref()
      }
    })
  }

  _createLSD () {
    const opts = Object.assign({}, {
      infoHash: this.infoHash,
      peerId: this.peerId,
      port: this._port
    })

    const lsd = new bittorrent_lsd_ignored_(opts)
    lsd.on('warning', this._onWarning)
    lsd.on('error', this._onError)
    lsd.on('peer', this._onLSDPeer)
    lsd.start()
    return lsd
  }
}

/* harmony default export */ const torrent_discovery = (Discovery);

;// CONCATENATED MODULE: ./node_modules/fsa-chunk-store/index.js
// this can be bad when multiple instances of this app are running
if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
  navigator.storage.getDirectory().then(storageDir => {
    storageDir.removeEntry('chunks', { recursive: true })
  })
}

const fsa_chunk_store_noop = () => {}
const err = (cb = fsa_chunk_store_noop, err) => queueMicrotask(() => cb(new Error(err)))
class FSAChunkStore {
  constructor (chunkLength, opts = {}) {
    this.chunkLength = Number(chunkLength)

    if (!this.chunkLength) {
      throw new Error('First argument must be a chunk length')
    }

    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
      throw new Error('FSA API is not supported')
    }

    this.closed = false

    this.name = opts.name || crypto.randomUUID()

    this.chunks = [] // individual chunks, required for reads :/

    this.rootDirPromise = opts.rootDir || navigator.storage.getDirectory()
    this.storageDirPromise = (async () => {
      const rootDir = await this.rootDirPromise
      return rootDir.getDirectoryHandle(this.name, { create: true })
    })()
    // if there are no files the chunks are the storage
    this.chunksDirPromise = this.storageDirPromise

    if (opts.files && opts.rootDir) {
      this.chunkMap = [] // full files
      this.directoryMap = {}
      // if files exist, use throwaway, wipeable folder for chunks which are a cache
      this.chunksDirPromise = this._getChunksDirHandle()
      this.files = opts.files.map((file, i, files) => {
        if (file.path == null) throw new Error('File is missing `path` property')
        if (file.length == null) throw new Error('File is missing `length` property')
        if (file.offset == null) {
          if (i === 0) {
            file.offset = 0
          } else {
            const prevFile = files[i - 1]
            file.offset = prevFile.offset + prevFile.length
          }
        }

        // file handles
        if (file.handle == null) file.handle = this._createFileHandle({ path: file.path })
        file.blob = this._createBlobReference(file.handle)

        // file chunkMap
        const fileStart = file.offset
        const fileEnd = file.offset + file.length

        const firstChunk = Math.floor(fileStart / this.chunkLength)
        const lastChunk = Math.floor((fileEnd - 1) / this.chunkLength)

        for (let i = firstChunk; i <= lastChunk; ++i) {
          const chunkStart = i * this.chunkLength
          const chunkEnd = chunkStart + this.chunkLength

          const from = (fileStart < chunkStart) ? 0 : fileStart - chunkStart
          const to = (fileEnd > chunkEnd) ? this.chunkLength : fileEnd - chunkStart
          const offset = (fileStart > chunkStart) ? 0 : chunkStart - fileStart

          if (!this.chunkMap[i]) this.chunkMap[i] = []

          this.chunkMap[i].push({ from, to, offset, file })
        }

        return file
      })

      // close streams is page is frozen/unloaded, they will re-open if the user returns via BFC
      window.addEventListener('pagehide', () => this.cleanup())

      this.length = this.files.reduce((sum, file) => sum + file.length, 0)
      if (opts.length != null && opts.length !== this.length) {
        throw new Error('total `files` length is not equal to explicit `length` option')
      }
    } else {
      this.length = Number(opts.length) || Infinity
    }

    if (this.length !== Infinity) {
      this.lastChunkLength = this.length % this.chunkLength || this.chunkLength
      this.lastChunkIndex = Math.ceil(this.length / this.chunkLength) - 1
    }
  }

  async _getChunkHandle (index) {
    let chunk = this.chunks[index]
    if (!chunk) {
      const storageDir = await this.chunksDirPromise
      this.chunks[index] = chunk = await storageDir.getFileHandle(index, { create: true })
    }
    return chunk
  }

  async _createFileHandle (opts) {
    const fileName = opts.path.slice(opts.path.lastIndexOf('/') + 1)
    return (await this._getDirectoryHandle(opts)).getFileHandle(fileName, { create: true })
  }

  async _createBlobReference (handle) {
    return (await handle).getFile()
  }

  // recursive, equiv of cd and mkdirp
  async _getDirectoryHandle (opts) {
    const lastIndex = opts.path.lastIndexOf('/')
    if (lastIndex === -1 || lastIndex === 0) return this.storageDirPromise
    const path = opts.path = opts.path.slice(0, lastIndex)
    if (!this.directoryMap[path]) {
      this.directoryMap[path] = (async () => {
        const parent = await this._getDirectoryHandle(opts)
        return parent.getDirectoryHandle(path.slice(path.lastIndexOf('/') + 1), { create: true })
      })()
    }
    return this.directoryMap[path]
  }

  async _getChunksDirHandle () {
    const storageDir = await navigator.storage.getDirectory()
    const chunksDir = await storageDir.getDirectoryHandle('chunks', { create: true })
    return chunksDir.getDirectoryHandle(this.name, { create: true })
  }

  async put (index, buf, cb = fsa_chunk_store_noop) {
    try {
      await this._put(index, buf)
      cb(null)
      return null
    } catch (e) {
      queueMicrotask(() => cb(e))
      return e
    }
  }

  // wrapped in prep for callback drop
  async _put (index, buf) {
    if (this.closed) throw new Error('Storage is closed')

    const isLastChunk = index === this.lastChunkIndex
    if (isLastChunk && buf.length !== this.lastChunkLength) throw new Error(`Last chunk length must be ${this.lastChunkLength}`)
    if (!isLastChunk && buf.length !== this.chunkLength) throw new Error(`Chunk length must be ${this.chunkLength}`)

    const chunkWrite = (async () => {
      const chunk = await this._getChunkHandle(index)
      const stream = await chunk.createWritable({ keepExistingData: false })
      await stream.write(buf)
      await stream.close()
    })()

    if (!this.files) return chunkWrite

    const targets = this.chunkMap[index]
    if (!targets) throw new Error('No files matching the request range')
    const promises = targets.map(async ({ file, offset, from, to }) => {
      if (!file.stream) {
        file.stream = await (await file.handle).createWritable({
          keepExistingData: true
        })
      }
      await file.stream.write({ type: 'write', position: offset, data: buf.slice(from, to) })
    })
    promises.push(chunkWrite)
    await Promise.all(promises)
  }

  async get (index, opts, cb = fsa_chunk_store_noop) {
    if (opts == null) opts = {}
    try {
      const data = await this._get(index, opts)
      cb(null, data)
      return data
    } catch (e) {
      cb(e)
      return e
    }
  }

  // wrapped in prep for callback drop
  async _get (index, opts) {
    if (typeof opts === 'function') return this.get(index, undefined, opts)
    if (this.closed) throw new Error('Storage is closed')

    const isLastChunk = index === this.lastChunkIndex
    const chunkLength = isLastChunk ? this.lastChunkLength : this.chunkLength

    const rangeFrom = opts.offset || 0
    const rangeTo = opts.length ? rangeFrom + opts.length : chunkLength
    const len = opts.length || chunkLength - rangeFrom

    if (rangeFrom < 0 || rangeFrom < 0 || rangeTo > chunkLength) throw new Error('Invalid offset and/or length')

    if (rangeFrom === rangeTo) return new Uint8Array(0)

    if (!this.files || this.chunks[index]) {
      const chunk = await this._getChunkHandle(index)
      let file = await chunk.getFile()
      if (rangeFrom !== 0 || len !== chunkLength) {
        file = file.slice(rangeFrom, len + rangeFrom)
      }
      const buf = await file.arrayBuffer()

      if (buf.byteLength === 0) throw new Error(`Index ${index} does not exist`)
      return new Uint8Array(buf)
    }

    // if chunk was GC'ed
    let targets = this.chunkMap[index]
    if (!targets) throw new Error('No files matching the request range')
    if (opts) {
      targets = targets.filter(({ from, to }) => to > rangeFrom && from < rangeTo)
      if (targets.length === 0) throw new Error('No files matching the request range')
    }

    const promises = targets.map(async ({ from, to, offset, file }) => {
      if (opts) {
        if (to > rangeTo) to = rangeTo
        if (from < rangeFrom) {
          offset += (rangeFrom - from)
          from = rangeFrom
        }
      }
      const blob = await file.blob
      return blob.slice(offset, offset + to - from)
    })
    const values = await Promise.all(promises)
    const buf = values.length === 1 ? await values[0].arrayBuffer() : await new Blob(values).arrayBuffer()
    if (buf.byteLength === 0) throw new Error(`Index ${index} does not exist`)
    return new Uint8Array(buf)
  }

  async close (cb = fsa_chunk_store_noop) {
    if (this.closed) return err(cb, 'Storage is closed')

    this.closed = true
    this.chunkMap = null
    this.directoryMap = null
    if (this.files) await this.cleanup()
    queueMicrotask(() => cb(null))
  }

  async cleanup () {
    const streams = []
    for (const file of this.files) {
      if (file.stream) {
        streams.push(file.stream.close())
        file.stream = null
      }
    }
    const clearChunks = (async () => {
      const storageDir = await this.chunksDirPromise
      this.chunks = []
      for await (const key of storageDir.keys()) {
        await storageDir.removeEntry(key, { recursive: true })
      }
      this.chunksDirPromise = await this._getChunksDirHandle()
    })()
    await Promise.all(streams)
    for (const file of this.files) {
      file.blob = this._createBlobReference(file.handle)
    }
    await clearChunks
  }

  async destroy (cb = fsa_chunk_store_noop) {
    this.close(async (err) => {
      if (err) {
        cb(err)
        return
      }
      try {
        const rootDir = await this.rootDirPromise
        await rootDir.removeEntry(this.name, { recursive: true })
      } catch (err) {
        cb(err)
        return
      }
      cb(null)
    })
  }
}

// EXTERNAL MODULE: ./node_modules/idb-chunk-store/index.js
var idb_chunk_store = __webpack_require__(4137);
// EXTERNAL MODULE: ./node_modules/memory-chunk-store/index.js
var memory_chunk_store = __webpack_require__(1191);
;// CONCATENATED MODULE: ./node_modules/hybrid-chunk-store/index.js





const isChrome = !!((typeof globalThis !== 'undefined' && globalThis) || (typeof self !== 'undefined' && self) || (typeof window !== 'undefined' && window) || (typeof globalThis !== 'undefined' && globalThis)).chrome

const limit = isChrome ? Infinity : 2147483648 - 16777216 // 2GB - 16MB

const FSASupport = typeof navigator !== 'undefined' && navigator.storage?.getDirectory && FileSystemFileHandle?.prototype?.createWritable

const hybrid_chunk_store_noop = () => {}

class HybridChunkStore {
  constructor (chunkLength, opts = {}) {
    this.chunkLength = Number(chunkLength)
    if (!this.chunkLength) throw new Error('First argument must be a chunk length')

    this.length = Number(opts.length) || Infinity

    this.limit = opts.limit || limit
    this.fallbackStore = null
    this.dataStore = null
    this.chunkCount = 0
    this.stores = []

    this._init(opts)
    if (this.dataStore) {
      if (opts.max > 0) this.dataStore = new cache_chunk_store(this.dataStore, { max: opts.max })
      this.stores.push(this.dataStore)
    }
    this.stores.push(this.fallbackStore)

    // check if chunk stores have asyncIterators

    // if (this.stores.every(store => !!store[Symbol.asyncIterator])) {
    //   this[Symbol.asyncIterator] = joinIterator(this.stores)
    // }
  }

  _init (opts) {
    if (opts.onlyMem || this.limit < this.chunkLength) {
      this.fallbackStore = new memory_chunk_store(this.chunkLength, opts)
      return
    }
    const ChunkStore = FSASupport ? FSAChunkStore : idb_chunk_store
    if (this.limit >= this.length) {
      this.fallbackStore = new ChunkStore(this.chunkLength, opts)
      return
    }

    this.chunkCount = Math.floor(Math.min(this.length, this.limit) / this.chunkLength)
    const length = this.chunkCount * this.chunkLength
    const remaining = this.length - length
    this.dataStore = new ChunkStore(this.chunkLength, { ...opts, length })
    this.fallbackStore = new memory_chunk_store(this.chunkLength, { ...opts, length: remaining })
  }

  get (index, opts, cb) {
    if (index >= this.chunkCount) {
      this.fallbackStore.get(index - this.chunkCount, opts, cb)
    } else {
      this.dataStore.get(index, opts, cb)
    }
  }

  put (index, buf, cb) {
    if (index >= this.chunkCount) {
      this.fallbackStore.put(index - this.chunkCount, buf, cb)
    } else {
      this.dataStore.put(index, buf, cb)
    }
  }

  close (cb = hybrid_chunk_store_noop) {
    Promise.all(this.stores.map(store => new Promise(resolve => store.close(resolve)))).then(values => {
      const err = values.find(value => value)
      cb(err)
    })
  }

  destroy (cb = hybrid_chunk_store_noop) {
    Promise.all(this.stores.map(store => new Promise(resolve => store.destroy(resolve)))).then(values => {
      const err = values.find(value => value)
      cb(err)
    })
  }
}

// EXTERNAL MODULE: ./node_modules/immediate-chunk-store/index.js
var immediate_chunk_store = __webpack_require__(3700);
// EXTERNAL MODULE: ./node_modules/lt_donthave/index.js
var lt_donthave = __webpack_require__(9417);
// EXTERNAL MODULE: ./node_modules/run-parallel-limit/index.js
var run_parallel_limit = __webpack_require__(9967);
// EXTERNAL MODULE: ./node_modules/torrent-piece/index.js
var torrent_piece = __webpack_require__(8687);
// EXTERNAL MODULE: ./node_modules/random-iterate/index.js
var random_iterate = __webpack_require__(5960);
;// CONCATENATED MODULE: ./node_modules/ut_metadata/index.js
/*! ut_metadata. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */






const ut_metadata_debug = src_browser('ut_metadata')

const MAX_METADATA_SIZE = 1E7 // 10 MB
const BITFIELD_GROW = 1E3
const PIECE_LENGTH = 1 << 14 // 16 KiB

/* harmony default export */ const ut_metadata = (metadata => {
  class utMetadata extends events.EventEmitter {
    constructor (wire) {
      super()

      this._wire = wire

      this._fetching = false
      this._metadataComplete = false
      this._metadataSize = null
      // how many reject messages to tolerate before quitting
      this._remainingRejects = null

      // The largest torrent file that I know of is ~1-2MB, which is ~100
      // pieces. Therefore, cap the bitfield to 10x that (1000 pieces) so a
      // malicious peer can't make it grow to fill all memory.
      this._bitfield = new esm/* default */.Z(0, { grow: BITFIELD_GROW })

      if (ArrayBuffer.isView(metadata)) {
        this.setMetadata(metadata)
      }
    }

    onHandshake (infoHash, peerId, extensions) {
      this._infoHash = infoHash
    }

    onExtendedHandshake (handshake) {
      if (!handshake.m || !handshake.m.ut_metadata) {
        return this.emit('warning', new Error('Peer does not support ut_metadata'))
      }
      if (!handshake.metadata_size) {
        return this.emit('warning', new Error('Peer does not have metadata'))
      }
      if (typeof handshake.metadata_size !== 'number' ||
          MAX_METADATA_SIZE < handshake.metadata_size ||
          handshake.metadata_size <= 0) {
        return this.emit('warning', new Error('Peer gave invalid metadata size'))
      }

      this._metadataSize = handshake.metadata_size
      this._numPieces = Math.ceil(this._metadataSize / PIECE_LENGTH)
      this._remainingRejects = this._numPieces * 2

      this._requestPieces()
    }

    onMessage (buf) {
      let dict
      let trailer
      try {
        const str = (0,browser/* arr2text */.vV)(buf)
        const trailerIndex = str.indexOf('ee') + 2
        dict = bencode/* default.decode */.Z.decode(str.substring(0, trailerIndex))
        trailer = buf.slice(trailerIndex)
      } catch (err) {
        // drop invalid messages
        return
      }

      switch (dict.msg_type) {
        case 0:
          // ut_metadata request (from peer)
          // example: { 'msg_type': 0, 'piece': 0 }
          this._onRequest(dict.piece)
          break
        case 1:
          // ut_metadata data (in response to our request)
          // example: { 'msg_type': 1, 'piece': 0, 'total_size': 3425 }
          this._onData(dict.piece, trailer, dict.total_size)
          break
        case 2:
          // ut_metadata reject (peer doesn't have piece we requested)
          // { 'msg_type': 2, 'piece': 0 }
          this._onReject(dict.piece)
          break
      }
    }

    /**
     * Ask the peer to send metadata.
     * @public
     */
    fetch () {
      if (this._metadataComplete) {
        return
      }
      this._fetching = true
      if (this._metadataSize) {
        this._requestPieces()
      }
    }

    /**
     * Stop asking the peer to send metadata.
     * @public
     */
    cancel () {
      this._fetching = false
    }

    async setMetadata (metadata) {
      if (this._metadataComplete) return true
      ut_metadata_debug('set metadata')

      // if full torrent dictionary was passed in, pull out just `info` key
      try {
        const info = bencode/* default.decode */.Z.decode(metadata).info
        if (info) {
          metadata = bencode/* default.encode */.Z.encode(info)
        }
      } catch (err) {}

      // check hash
      if (this._infoHash && this._infoHash !== await (0,browser/* hash */.vp)(metadata, 'hex')) {
        // return false // Disabling infohash check [CG]
      }

      this.cancel()

      this.metadata = metadata
      this._metadataComplete = true
      this._metadataSize = this.metadata.length
      this._wire.extendedHandshake.metadata_size = this._metadataSize

      this.emit('metadata', bencode/* default.encode */.Z.encode({
        info: bencode/* default.decode */.Z.decode(this.metadata)
      }))

      return true
    }

    _send (dict, trailer) {
      let buf = bencode/* default.encode */.Z.encode(dict)
      if (ArrayBuffer.isView(trailer)) {
        buf = (0,browser/* concat */.zo)([buf, trailer])
      }
      this._wire.extended('ut_metadata', buf)
    }

    _request (piece) {
      this._send({ msg_type: 0, piece })
    }

    _data (piece, buf, totalSize) {
      const msg = { msg_type: 1, piece }
      if (typeof totalSize === 'number') {
        msg.total_size = totalSize
      }
      this._send(msg, buf)
    }

    _reject (piece) {
      this._send({ msg_type: 2, piece })
    }

    _onRequest (piece) {
      if (!this._metadataComplete) {
        this._reject(piece)
        return
      }
      const start = piece * PIECE_LENGTH
      let end = start + PIECE_LENGTH
      if (end > this._metadataSize) {
        end = this._metadataSize
      }
      const buf = this.metadata.slice(start, end)
      this._data(piece, buf, this._metadataSize)
    }

    _onData (piece, buf, totalSize) {
      if (buf.length > PIECE_LENGTH || !this._fetching) {
        return
      }
      this.metadata.set(buf, piece * PIECE_LENGTH)
      this._bitfield.set(piece)
      this._checkDone()
    }

    _onReject (piece) {
      if (this._remainingRejects > 0 && this._fetching) {
        // If we haven't been rejected too much,
        // then try to request the piece again
        this._request(piece)
        this._remainingRejects -= 1
      } else {
        this.emit('warning', new Error('Peer sent "reject" too much'))
      }
    }

    _requestPieces () {
      if (!this._fetching) return
      this.metadata = new Uint8Array(this._metadataSize)
      for (let piece = 0; piece < this._numPieces; piece++) {
        this._request(piece)
      }
    }

    async _checkDone () {
      let done = true
      for (let piece = 0; piece < this._numPieces; piece++) {
        if (!this._bitfield.get(piece)) {
          done = false
          break
        }
      }
      if (!done) return

      // attempt to set metadata -- may fail sha1 check
      const success = await this.setMetadata(this.metadata)

      if (!success) {
        this._failedMetadata()
      }
    }

    _failedMetadata () {
      // reset bitfield & try again
      this._bitfield = new esm/* default */.Z(0, { grow: BITFIELD_GROW })
      this._remainingRejects -= this._numPieces
      if (this._remainingRejects > 0) {
        this._requestPieces()
      } else {
        this.emit('warning', new Error('Peer sent invalid metadata'))
      }
    }
  }

  // Name of the bittorrent-protocol extension
  utMetadata.prototype.name = 'ut_metadata'

  return utMetadata
});

// EXTERNAL MODULE: ut_pex (ignored)
var ut_pex_ignored_ = __webpack_require__(8838);
// EXTERNAL MODULE: ./node_modules/streamx/index.js
var streamx = __webpack_require__(1237);
// EXTERNAL MODULE: ./node_modules/mime/lite.js
var lite = __webpack_require__(2109);
;// CONCATENATED MODULE: ./lib/file-iterator.js



const file_iterator_debug = src_browser('webtorrent:file-iterator')

/**
 * Async iterator of a torrent file
 *
 * @param {File} file
 * @param {Object} opts
 * @param {number} opts.start iterator slice of file, starting from this byte (inclusive)
 * @param {number} opts.end iterator slice of file, ending with this byte (inclusive)
 */
class FileIterator extends events {
  constructor (file, { start, end }) {
    super()

    this._torrent = file._torrent

    this._pieceLength = file._torrent.pieceLength

    this._startPiece = (start + file.offset) / this._pieceLength | 0
    this._endPiece = (end + file.offset) / this._pieceLength | 0

    this._piece = this._startPiece
    this._offset = (start + file.offset) - (this._startPiece * this._pieceLength)

    this._missing = end - start + 1
    this._criticalLength = Math.min((1024 * 1024 / this._pieceLength) | 0, 2)

    this._torrent.select(this._startPiece, this._endPiece, true, () => {
      this.emit('_notify')
    })
    this.destroyed = false
  }

  [Symbol.asyncIterator] () {
    return this
  }

  next () {
    return new Promise((resolve, reject) => {
      if (this._missing === 0 || this.destroyed) {
        resolve({ done: true })
        return this.destroy()
      }
      const pump = (index, opts) => {
        if (!this._torrent.bitfield.get(index)) {
          this._torrent.critical(index, index + this._criticalLength)
          const listener = () => {
            if (this._torrent.bitfield.get(index)) {
              this.removeListener('_notify', listener)
              pump(index, opts)
            }
          }
          return this.on('_notify', listener)
        }

        if (this._torrent.destroyed) return reject(new Error('Torrent removed'))

        this._torrent.store.get(index, opts, (err, buffer) => {
          if (this.destroyed) return resolve({ done: true }) // prevent hanging
          file_iterator_debug('read %s and yielding (length %s) (err %s)', index, buffer?.length, err?.message)

          if (err) return reject(err)

          // prevent re-wrapping outside of promise
          resolve({ value: buffer, done: false })
        })
      }

      const length = Math.min(this._missing, this._pieceLength - this._offset)

      pump(this._piece++, { length, offset: this._offset })
      this._missing -= length
      this._offset = 0
    })
  }

  async return () {
    this.destroy()
    const { value } = await this.next()
    return { done: true, value }
  }

  async throw (err) {
    throw err
  }

  destroy (cb = () => {}, err) {
    if (this.destroyed) return
    this.destroyed = true
    if (!this._torrent.destroyed) {
      this._torrent.deselect(this._startPiece, this._endPiece, true)
    }
    this.emit('return')
    cb(err)
  }
}

;// CONCATENATED MODULE: ./lib/file.js






class file_File extends events {
  constructor (torrent, file) {
    super()

    this._torrent = torrent
    this._destroyed = false
    this._fileStreams = new Set()
    this._iterators = new Set()

    this.name = file.name
    this.path = file.path
    this.length = file.length
    this.size = file.length
    this.type = lite.getType(this.name) || 'application/octet-stream'
    this.offset = file.offset

    this.done = false

    const start = file.offset
    const end = start + file.length - 1

    this._startPiece = start / this._torrent.pieceLength | 0
    this._endPiece = end / this._torrent.pieceLength | 0

    if (this.length === 0) {
      this.done = true
      this.emit('done')
    }

    this._client = torrent.client
  }

  get downloaded () {
    if (this._destroyed || !this._torrent.bitfield) return 0

    const { pieces, bitfield, pieceLength, lastPieceLength } = this._torrent
    const { _startPiece: start, _endPiece: end } = this

    const getPieceLength = (pieceIndex) => (
      pieceIndex === pieces.length - 1 ? lastPieceLength : pieceLength
    )

    const getPieceDownloaded = (pieceIndex) => {
      const len = pieceIndex === pieces.length - 1 ? lastPieceLength : pieceLength
      if (bitfield.get(pieceIndex)) {
        // verified data
        return len
      } else {
        // "in progress" data
        return len - pieces[pieceIndex].missing
      }
    }

    let downloaded = 0
    for (let index = start; index <= end; index += 1) {
      const pieceDownloaded = getPieceDownloaded(index)
      downloaded += pieceDownloaded

      if (index === start) {
        // First piece may have an offset, e.g. irrelevant bytes from the end of
        // the previous file
        const irrelevantFirstPieceBytes = this.offset % pieceLength
        downloaded -= Math.min(irrelevantFirstPieceBytes, pieceDownloaded)
      }

      if (index === end) {
        // Last piece may have an offset, e.g. irrelevant bytes from the start
        // of the next file
        const irrelevantLastPieceBytes = getPieceLength(end) - (this.offset + this.length) % pieceLength
        downloaded -= Math.min(irrelevantLastPieceBytes, pieceDownloaded)
      }
    }

    return downloaded
  }

  get progress () {
    return this.length ? this.downloaded / this.length : 0
  }

  select (priority) {
    if (this.length === 0) return
    this._torrent.select(this._startPiece, this._endPiece, priority)
  }

  deselect () {
    if (this.length === 0) return
    this._torrent.deselect(this._startPiece, this._endPiece, false)
  }

  [Symbol.asyncIterator] (opts = {}) {
    if (this.length === 0) return (async function * empty () {})()

    const { start = 0 } = opts ?? {}
    const end = (opts?.end && opts.end < this.length)
      ? opts.end
      : this.length - 1

    if (this.done) {
      return chunkStoreRead(this._torrent.store, { offset: start + this.offset, length: end - start + 1 })
    }

    const iterator = new FileIterator(this, { start, end })
    this._iterators.add(iterator)
    iterator.once('return', () => {
      this._iterators.delete(iterator)
    })

    return iterator
  }

  createReadStream (opts) {
    const iterator = this[Symbol.asyncIterator](opts)
    const fileStream = streamx.Readable.from(iterator)

    this._fileStreams.add(fileStream)
    fileStream.once('close', () => {
      this._fileStreams.delete(fileStream)
    })

    return fileStream
  }

  async arrayBuffer (opts) {
    const data = new Uint8Array(this.length)
    let offset = 0
    for await (const chunk of this[Symbol.asyncIterator](opts)) {
      data.set(chunk, offset)
      offset += chunk.length
    }
    return data.buffer
  }

  async blob (opts) {
    // return new Blob([await this.arrayBuffer(opts)], { mimeType: this.type })
    return new Blob([await this.arrayBuffer(opts)], { type: this.type }) // bug fix [CG]
  }

  stream (opts) {
    let iterator
    return new ReadableStream({
      start () {
        iterator = this[Symbol.asyncIterator](opts)
      },
      async pull ({ close, enqueue }) {
        const { value, done } = await iterator.next()

        if (done) {
          close()
        } else {
          enqueue(value)
        }
      },
      cancel () {
        iterator.return()
      }
    })
  }

  get streamURL () {
    if (!this._client._server) throw new Error('No server created')
    const url = `${this._client._server.pathname}/${this._torrent.infoHash}/${encodeURI(this.path)}`
    return url
  }

  streamTo (elem) {
    elem.src = this.streamURL
    return elem
  }

  includes (piece) {
    return this._startPiece <= piece && this._endPiece >= piece
  }

  _destroy () {
    this._destroyed = true
    this._torrent = null

    for (const fileStream of this._fileStreams) {
      fileStream.destroy()
    }
    this._fileStreams.clear()
    for (const iterator of this._iterators) {
      iterator.destroy()
    }
    this._iterators.clear()
  }
}

// EXTERNAL MODULE: ./lib/peer.js
var lib_peer = __webpack_require__(3287);
;// CONCATENATED MODULE: ./lib/rarity-map.js

/**
 * Mapping of torrent pieces to their respective availability in the torrent swarm. Used
 * by the torrent manager for implementing the rarest piece first selection strategy.
 */
class RarityMap {
  constructor (torrent) {
    this._torrent = torrent
    this._numPieces = torrent.pieces.length
    this._pieces = new Array(this._numPieces)

    this._onWire = wire => {
      this.recalculate()
      this._initWire(wire)
    }
    this._onWireHave = index => {
      this._pieces[index] += 1
    }
    this._onWireBitfield = () => {
      this.recalculate()
    }

    this._torrent.wires.forEach(wire => {
      this._initWire(wire)
    })
    this._torrent.on('wire', this._onWire)
    this.recalculate()
  }

  /**
   * Get the index of the rarest piece. Optionally, pass a filter function to exclude
   * certain pieces (for instance, those that we already have).
   *
   * @param {function} pieceFilterFunc
   * @return {number} index of rarest piece, or -1
   */
  getRarestPiece (pieceFilterFunc) {
    let candidates = []
    let min = Infinity

    for (let i = 0; i < this._numPieces; ++i) {
      if (pieceFilterFunc && !pieceFilterFunc(i)) continue

      const availability = this._pieces[i]
      if (availability === min) {
        candidates.push(i)
      } else if (availability < min) {
        candidates = [i]
        min = availability
      }
    }

    if (candidates.length) {
      // if there are multiple pieces with the same availability, choose one randomly
      return candidates[Math.random() * candidates.length | 0]
    } else {
      return -1
    }
  }

  destroy () {
    this._torrent.removeListener('wire', this._onWire)
    this._torrent.wires.forEach(wire => {
      this._cleanupWireEvents(wire)
    })
    this._torrent = null
    this._pieces = null

    this._onWire = null
    this._onWireHave = null
    this._onWireBitfield = null
  }

  _initWire (wire) {
    wire._onClose = () => {
      this._cleanupWireEvents(wire)
      for (let i = 0; i < this._numPieces; ++i) {
        this._pieces[i] -= wire.peerPieces.get(i)
      }
    }

    wire.on('have', this._onWireHave)
    wire.on('bitfield', this._onWireBitfield)
    wire.once('close', wire._onClose)
  }

  /**
   * Recalculates piece availability across all peers in the torrent.
   */
  recalculate () {
    this._pieces.fill(0)

    for (const wire of this._torrent.wires) {
      for (let i = 0; i < this._numPieces; ++i) {
        this._pieces[i] += wire.peerPieces.get(i)
      }
    }
  }

  _cleanupWireEvents (wire) {
    wire.removeListener('have', this._onWireHave)
    wire.removeListener('bitfield', this._onWireBitfield)
    if (wire._onClose) wire.removeListener('close', wire._onClose)
    wire._onClose = null
  }
}

// EXTERNAL MODULE: ./utp.js (ignored)
var utp_ignored_ = __webpack_require__(6475);
// EXTERNAL MODULE: ./node_modules/bittorrent-protocol/index.js
var bittorrent_protocol = __webpack_require__(814);
;// CONCATENATED MODULE: ./package.json
const package_namespaceObject = {"i8":"2.0.14"};
;// CONCATENATED MODULE: ./lib/webconn.js










const webconn_debug = src_browser('webtorrent:webconn')
const VERSION = package_namespaceObject.i8

const SOCKET_TIMEOUT = 60000
const RETRY_DELAY = 10000

/**
 * Converts requests for torrent blocks into http range requests.
 * @param {string} url web seed url
 * @param {Object} torrent
 */
class WebConn extends bittorrent_protocol/* default */.Z {
  constructor (url, torrent) {
    super()

    this.url = url
    this.connId = url // Unique id to deduplicate web seeds
    this._torrent = torrent

    this._init(url)
  }

  _init (url) {
    this.setKeepAlive(true)

    this.use(lt_donthave())

    this.once('handshake', async (infoHash, peerId) => {
      const hex = await (0,browser/* hash */.vp)(url, 'hex') // Used as the peerId for this fake remote peer
      if (this.destroyed) return
      this.handshake(infoHash, hex)

      const numPieces = this._torrent.pieces.length
      const bitfield = new esm/* default */.Z(numPieces)
      for (let i = 0; i <= numPieces; i++) {
        bitfield.set(i, true)
      }
      this.bitfield(bitfield)
    })

    this.once('interested', () => {
      webconn_debug('interested')
      this.unchoke()
    })

    this.on('uninterested', () => { webconn_debug('uninterested') })
    this.on('choke', () => { webconn_debug('choke') })
    this.on('unchoke', () => { webconn_debug('unchoke') })
    this.on('bitfield', () => { webconn_debug('bitfield') })
    this.lt_donthave.on('donthave', () => { webconn_debug('donthave') })

    this.on('request', (pieceIndex, offset, length, callback) => {
      webconn_debug('request pieceIndex=%d offset=%d length=%d', pieceIndex, offset, length)
      this.httpRequest(pieceIndex, offset, length, (err, data) => {
        if (err) {
          // Cancel all in progress requests for this piece
          this.lt_donthave.donthave(pieceIndex)

          // Wait a little while before saying the webseed has the failed piece again
          const retryTimeout = setTimeout(() => {
            if (this.destroyed) return

            this.have(pieceIndex)
          }, RETRY_DELAY)
          if (retryTimeout.unref) retryTimeout.unref()
        }

        callback(err, data)
      })
    })
  }

  async httpRequest (pieceIndex, offset, length, cb) {
    cb = once(cb)
    const pieceOffset = pieceIndex * this._torrent.pieceLength
    const rangeStart = pieceOffset + offset /* offset within whole torrent */
    const rangeEnd = rangeStart + length - 1

    // Web seed URL format:
    // For single-file torrents, make HTTP range requests directly to the web seed URL
    // For multi-file torrents, add the torrent folder and file name to the URL
    const files = this._torrent.files
    let requests
    if (files.length <= 1) {
      requests = [{
        url: this.url,
        start: rangeStart,
        end: rangeEnd
      }]
    } else {
      const requestedFiles = files.filter(file => file.offset <= rangeEnd && (file.offset + file.length) > rangeStart)
      if (requestedFiles.length < 1) {
        return cb(new Error('Could not find file corresponding to web seed range request'))
      }

      requests = requestedFiles.map(requestedFile => {
        const fileEnd = requestedFile.offset + requestedFile.length - 1
        const url = this.url +
          (this.url[this.url.length - 1] === '/' ? '' : '/') +
          requestedFile.path.replace(this._torrent.path, '')
        return {
          url,
          fileOffsetInRange: Math.max(requestedFile.offset - rangeStart, 0),
          start: Math.max(rangeStart - requestedFile.offset, 0),
          end: Math.min(fileEnd, rangeEnd - requestedFile.offset)
        }
      })
    }

    const chunks = await Promise.all(requests.map(async ({ start, end, url }) => {
      webconn_debug(
        'Requesting url=%s pieceIndex=%d offset=%d length=%d start=%d end=%d',
        url, pieceIndex, offset, length, start, end
      )
      let res
      try {
        res = await cross_fetch_ponyfill_browser(url, {
          cache: 'no-store',
          method: 'GET',
          headers: {
            'Cache-Control': 'no-store',
            'user-agent': `WebTorrent/${VERSION} (https://webtorrent.io)`,
            range: `bytes=${start}-${end}`
          },
          signal: AbortSignal.timeout(SOCKET_TIMEOUT)
        })
      } catch (e) {
        return cb(e)
      }
      if (!res.ok) return cb(new Error(`Unexpected HTTP status code ${res.status}`))
      let data
      try {
        data = new Uint8Array(await res.arrayBuffer())
      } catch (e) {
        return cb(e)
      }

      webconn_debug('Got data of length %d', data.length)

      return data
    }))

    cb(null, (0,browser/* concat */.zo)(chunks))
  }

  destroy () {
    super.destroy()
    this._torrent = null
  }
}

;// CONCATENATED MODULE: ./lib/torrent.js
/* provided dependency */ var torrent_process = __webpack_require__(8768);


 // browser exclude
 // browser exclude








 // browser: `hybrid-chunk-store`















 // browser exclude




 // browser exclude




const torrent_debug = src_browser('webtorrent:torrent')
const MAX_BLOCK_LENGTH = 128 * 1024
const PIECE_TIMEOUT = 30_000
const CHOKE_TIMEOUT = 5_000
const SPEED_THRESHOLD = 3 * torrent_piece.BLOCK_LENGTH

const PIPELINE_MIN_DURATION = 0.5
const PIPELINE_MAX_DURATION = 1

const RECHOKE_INTERVAL = 10_000 // 10 seconds
const RECHOKE_OPTIMISTIC_DURATION = 2 // 30 seconds

const DEFAULT_NO_PEERS_INTERVAL = 30_000 // 30 seconds

// IndexedDB chunk stores used in the browser benefit from high concurrency
const FILESYSTEM_CONCURRENCY = torrent_process.browser ? cpus_browser().length : 2

const RECONNECT_WAIT = [1_000, 5_000, 15_000]

const torrent_VERSION = package_namespaceObject.i8
const USER_AGENT = `WebTorrent/${torrent_VERSION} (https://webtorrent.io)`

let TMP
try {
  TMP = path_browserify.join(fs_ignored_0.statSync('/tmp') && '/tmp', 'webtorrent')
} catch (err) {
  TMP = path_browserify.join(typeof os_ignored_.tmpdir === 'function' ? os_ignored_.tmpdir() : '/', 'webtorrent')
}

class Torrent extends events {
  constructor (torrentId, client, opts) {
    super()

    this._debugId = 'unknown infohash'
    this.client = client

    this.announce = opts.announce
    this.urlList = opts.urlList

    this.path = opts.path || TMP
    this.addUID = opts.addUID || false
    this.rootDir = opts.rootDir || null
    this.skipVerify = !!opts.skipVerify
    this._store = opts.store || HybridChunkStore
    this._preloadedStore = opts.preloadedStore || null
    this._storeCacheSlots = opts.storeCacheSlots !== undefined ? opts.storeCacheSlots : 20
    this._destroyStoreOnDestroy = opts.destroyStoreOnDestroy || false
    this.store = null
    this.storeOpts = opts.storeOpts

    this._getAnnounceOpts = opts.getAnnounceOpts

    // if defined, `opts.private` overrides default privacy of torrent
    if (typeof opts.private === 'boolean') this.private = opts.private

    this.strategy = opts.strategy || 'sequential'

    this.maxWebConns = opts.maxWebConns || 4

    this._rechokeNumSlots = (opts.uploads === false || opts.uploads === 0)
      ? 0
      : (+opts.uploads || 10)
    this._rechokeOptimisticWire = null
    this._rechokeOptimisticTime = 0
    this._rechokeIntervalId = null
    this._noPeersIntervalId = null
    this._noPeersIntervalTime = opts.noPeersIntervalTime ? opts.noPeersIntervalTime * 1000 : DEFAULT_NO_PEERS_INTERVAL

    this.ready = false
    this.destroyed = false
    this.paused = opts.paused || false
    this.done = false

    this.metadata = null
    this.files = []

    // Pieces that need to be downloaded, indexed by piece index
    this.pieces = []

    this._amInterested = false
    this._selections = []
    this._critical = []

    this.wires = [] // open wires (added *after* handshake)

    this._queue = [] // queue of outgoing tcp peers to connect to
    this._peers = {} // connected peers (addr/peerId -> Peer)
    this._peersLength = 0 // number of elements in `this._peers` (cache, for perf)

    // stats
    this.received = 0
    this.uploaded = 0
    this._downloadSpeed = throughput()
    this._uploadSpeed = throughput()

    // for cleanup
    this._servers = []
    this._xsRequests = []

    // TODO: remove this and expose a hook instead
    // optimization: don't recheck every file if it hasn't changed
    this._fileModtimes = opts.fileModtimes

    if (torrentId !== null) this._onTorrentId(torrentId)

    this._debug('new torrent')
  }

  get timeRemaining () {
    if (this.done) return 0
    if (this.downloadSpeed === 0) return Infinity
    return ((this.length - this.downloaded) / this.downloadSpeed) * 1000
  }

  get downloaded () {
    if (!this.bitfield) return 0
    let downloaded = 0
    for (let index = 0, len = this.pieces.length; index < len; ++index) {
      if (this.bitfield.get(index)) { // verified data
        downloaded += (index === len - 1) ? this.lastPieceLength : this.pieceLength
      } else { // "in progress" data
        const piece = this.pieces[index]
        downloaded += (piece.length - piece.missing)
      }
    }
    return downloaded
  }

  // TODO: re-enable this. The number of missing pieces. Used to implement 'end game' mode.
  // Object.defineProperty(Storage.prototype, 'numMissing', {
  //   get: function () {
  //     var self = this
  //     var numMissing = self.pieces.length
  //     for (var index = 0, len = self.pieces.length; index < len; index++) {
  //       numMissing -= self.bitfield.get(index)
  //     }
  //     return numMissing
  //   }
  // })

  get downloadSpeed () { return this._downloadSpeed() }

  get uploadSpeed () { return this._uploadSpeed() }

  get progress () { return this.length ? this.downloaded / this.length : 0 }

  get ratio () { return this.uploaded / (this.received || this.length) }

  get numPeers () { return this.wires.length }

  get torrentFileBlob () {
    if (!this.torrentFile) return null
    return new Blob([this.torrentFile], { type: 'application/x-bittorrent' })
  }

  get _numQueued () {
    return this._queue.length + (this._peersLength - this._numConns)
  }

  get _numConns () {
    let numConns = 0
    for (const id in this._peers) {
      if (this._peers[id].connected) numConns += 1
    }
    return numConns
  }

  async _onTorrentId (torrentId) {
    if (this.destroyed) return

    let parsedTorrent
    try { parsedTorrent = await parse_torrent(torrentId) } catch (err) {}
    if (parsedTorrent) {
      // Attempt to set infoHash property synchronously
      this.infoHash = parsedTorrent.infoHash
      this._debugId = (0,browser/* arr2hex */.oc)(parsedTorrent.infoHash).substring(0, 7)
      queue_microtask(() => {
        if (this.destroyed) return
        this._onParsedTorrent(parsedTorrent)
      })
    } else {
      // If torrentId failed to parse, it could be in a form that requires an async
      // operation, i.e. http/https link, filesystem path, or Blob.
      parseTorrentRemote(torrentId, (err, parsedTorrent) => {
        if (this.destroyed) return
        if (err) return this._destroy(err)
        this._onParsedTorrent(parsedTorrent)
      })
    }
  }

  _onParsedTorrent (parsedTorrent) {
    if (this.destroyed) return

    this._processParsedTorrent(parsedTorrent)

    if (!this.infoHash) {
      return this._destroy(new Error('Malformed torrent data: No info hash'))
    }

    this._rechokeIntervalId = setInterval(() => {
      this._rechoke()
    }, RECHOKE_INTERVAL)
    if (this._rechokeIntervalId.unref) this._rechokeIntervalId.unref()

    // Private 'infoHash' event allows client.add to check for duplicate torrents and
    // destroy them before the normal 'infoHash' event is emitted. Prevents user
    // applications from needing to deal with duplicate 'infoHash' events.
    this.emit('_infoHash', this.infoHash)
    if (this.destroyed) return

    this.emit('infoHash', this.infoHash)
    if (this.destroyed) return // user might destroy torrent in event handler

    if (this.client.listening) {
      this._onListening()
    } else {
      this.client.once('listening', () => {
        this._onListening()
      })
    }
  }

  _processParsedTorrent (parsedTorrent) {
    this._debugId = (0,browser/* arr2hex */.oc)(parsedTorrent.infoHash).substring(0, 7)

    if (typeof this.private !== 'undefined') {
      // `private` option overrides default, only if it's defined
      parsedTorrent.private = this.private
    }

    if (this.announce) {
      // Allow specifying trackers via `opts` parameter
      parsedTorrent.announce = parsedTorrent.announce.concat(this.announce)
    }

    if (this.client.tracker && globalThis.WEBTORRENT_ANNOUNCE && !parsedTorrent.private) {
      // So `webtorrent-hybrid` can force specific trackers to be used
      parsedTorrent.announce = parsedTorrent.announce.concat(globalThis.WEBTORRENT_ANNOUNCE)
    }

    if (this.urlList) {
      // Allow specifying web seeds via `opts` parameter
      parsedTorrent.urlList = parsedTorrent.urlList.concat(this.urlList)
    }

    // remove duplicates by converting to Set and back
    parsedTorrent.announce = Array.from(new Set(parsedTorrent.announce))
    parsedTorrent.urlList = Array.from(new Set(parsedTorrent.urlList))

    Object.assign(this, parsedTorrent)

    this.magnetURI = toMagnetURI(parsedTorrent)
    this.torrentFile = encodeTorrentFile(parsedTorrent)
  }

  _onListening () {
    if (this.destroyed) return

    if (this.info) {
      // if full metadata was included in initial torrent id, use it immediately. Otherwise,
      // wait for torrent-discovery to find peers and ut_metadata to get the metadata.
      this._onMetadata(this)
    } else {
      if (this.xs) this._getMetadataFromServer()
      this._startDiscovery()
    }
  }

  _startDiscovery () {
    if (this.discovery || this.destroyed) return

    let trackerOpts = this.client.tracker
    if (trackerOpts) {
      trackerOpts = Object.assign({}, this.client.tracker, {
        getAnnounceOpts: () => {
          if (this.destroyed) return

          const opts = {
            uploaded: this.uploaded,
            downloaded: this.downloaded,
            left: Math.max(this.length - this.downloaded, 0)
          }
          if (this.client.tracker.getAnnounceOpts) {
            Object.assign(opts, this.client.tracker.getAnnounceOpts())
          }
          if (this._getAnnounceOpts) {
            // TODO: consider deprecating this, as it's redundant with the former case
            Object.assign(opts, this._getAnnounceOpts())
          }
          return opts
        }
      })
    }

    // add BEP09 peer-address
    if (this.peerAddresses) {
      this.peerAddresses.forEach(peer => this.addPeer(peer, lib_peer["default"].SOURCE_MANUAL))
    }

    // begin discovering peers via DHT and trackers
    this.discovery = new torrent_discovery({
      infoHash: this.infoHash,
      announce: this.announce,
      peerId: this.client.peerId,
      dht: !this.private && this.client.dht,
      tracker: trackerOpts,
      port: this.client.torrentPort,
      userAgent: USER_AGENT,
      lsd: this.client.lsd
    })

    this.discovery.on('error', (err) => {
      this._destroy(err)
    })

    this.discovery.on('peer', (peer, source) => {
      this._debug('peer %s discovered via %s', peer, source)
      // Don't create new outgoing TCP connections when torrent is done
      if (typeof peer === 'string' && this.done) return
      this.addPeer(peer, source)
    })

    this.discovery.on('trackerAnnounce', () => {
      this.emit('trackerAnnounce')
    })

    this.discovery.on('dhtAnnounce', () => {
      this.emit('dhtAnnounce')
    })

    this.discovery.on('warning', (err) => {
      this.emit('warning', err)
    })

    this._noPeersIntervalId = setInterval(() => {
      if (this.destroyed) return

      const counters = {
        [lib_peer["default"].SOURCE_TRACKER]: {
          enabled: !!this.client.tracker,
          numPeers: 0
        },
        [lib_peer["default"].SOURCE_DHT]: {
          enabled: !!this.client.dht,
          numPeers: 0
        },
        [lib_peer["default"].SOURCE_LSD]: {
          enabled: !!this.client.lsd,
          numPeers: 0
        },
        [lib_peer["default"].SOURCE_UT_PEX]: {
          enabled: (this.client.utPex && typeof ut_pex_ignored_ === 'function'),
          numPeers: 0
        }
      }
      for (const peer of Object.values(this._peers)) {
        const counter = counters[peer.source]
        if (typeof counter !== 'undefined') counter.numPeers++
      }
      for (const source of Object.keys(counters)) {
        const counter = counters[source]
        if (counter.enabled && counter.numPeers === 0) this.emit('noPeers', source)
      }
    }, this._noPeersIntervalTime)
    if (this._noPeersIntervalId.unref) this._noPeersIntervalId.unref()
  }

  _getMetadataFromServer () {
    // to allow function hoisting
    const self = this

    const urls = Array.isArray(this.xs) ? this.xs : [this.xs]

    self._xsRequestsController = new AbortController()

    const signal = self._xsRequestsController.signal

    const tasks = urls.map(url => cb => {
      getMetadataFromURL(url, cb)
    })
    run_parallel(tasks)

    async function getMetadataFromURL (url, cb) {
      if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
        self.emit('warning', new Error(`skipping non-http xs param: ${url}`))
        return cb(null)
      }

      const opts = {
        method: 'GET',
        headers: {
          'user-agent': USER_AGENT
        },
        signal
      }
      let res
      try {
        res = await cross_fetch_ponyfill_browser(url, opts)
      } catch (err) {
        self.emit('warning', new Error(`http error from xs param: ${url}`))
        return cb(null)
      }

      if (self.destroyed) return cb(null)
      if (self.metadata) return cb(null)

      if (res.status !== 200) {
        self.emit('warning', new Error(`non-200 status code ${res.status} from xs param: ${url}`))
        return cb(null)
      }
      let torrent
      try {
        torrent = new Uint8Array(await res.arrayBuffer())
      } catch (e) {
        self.emit('warning', e)
        return cb(null)
      }

      let parsedTorrent
      try {
        parsedTorrent = await parse_torrent(torrent)
      } catch (err) {}

      if (!parsedTorrent) {
        self.emit('warning', new Error(`got invalid torrent file from xs param: ${url}`))
        return cb(null)
      }

      if (parsedTorrent.infoHash !== self.infoHash) {
        self.emit('warning', new Error(`got torrent file with incorrect info hash from xs param: ${url}`))
        // return cb(null) // Disabling infohash check [CG]
      }
      self._onMetadata(parsedTorrent)
      cb(null)
    }
  }

  /**
   * Called when the full torrent metadata is received.
   */
  async _onMetadata (metadata) {
    if (this.metadata || this.destroyed) return
    this._debug('got metadata')

    this._xsRequestsController?.abort()
    this._xsRequestsController = null

    let parsedTorrent
    if (metadata && metadata.infoHash) {
      // `metadata` is a parsed torrent (from parse-torrent module)
      parsedTorrent = metadata
    } else {
      try {
        parsedTorrent = await parse_torrent(metadata)
      } catch (err) {
        return this._destroy(err)
      }
    }

    this._processParsedTorrent(parsedTorrent)
    this.metadata = this.torrentFile

    // add web seed urls (BEP19)
    if (this.client.enableWebSeeds) {
      this.urlList.forEach(url => {
        this.addWebSeed(url)
      })
    }

    this._rarityMap = new RarityMap(this)

    this.files = this.files.map(file => new file_File(this, file))

    let rawStore = this._preloadedStore
    if (!rawStore) {
      rawStore = new this._store(this.pieceLength, {
        ...this.storeOpts,
        torrent: this,
        path: this.path,
        files: this.files,
        length: this.length,
        name: this.name + ' - ' + this.infoHash.slice(0, 8),
        addUID: this.addUID,
        rootDir: this.rootDir,
        max: this._storeCacheSlots
      })
    }

    // don't use the cache if the store is already in memory
    if (this._storeCacheSlots > 0 && !(rawStore instanceof memory_chunk_store || rawStore instanceof HybridChunkStore)) {
      rawStore = new cache_chunk_store(rawStore, {
        max: this._storeCacheSlots
      })
    }

    this.store = new immediate_chunk_store(
      rawStore
    )

    // Select only specified files (BEP53) http://www.bittorrent.org/beps/bep_0053.html
    if (this.so) {
      this.files.forEach((v, i) => {
        if (this.so.includes(i)) {
          this.files[i].select()
        } else {
          this.files[i].deselect()
        }
      })
    } else {
      // start off selecting the entire torrent with low priority
      if (this.pieces.length !== 0) {
        this.select(0, this.pieces.length - 1, false)
      }
    }

    this._hashes = this.pieces

    this.pieces = this.pieces.map((hash, i) => {
      const pieceLength = (i === this.pieces.length - 1)
        ? this.lastPieceLength
        : this.pieceLength
      return new torrent_piece(pieceLength)
    })

    this._reservations = this.pieces.map(() => [])

    this.bitfield = new esm/* default */.Z(this.pieces.length)

    // Emit 'metadata' before 'ready' and 'done'
    this.emit('metadata')

    // User might destroy torrent in response to 'metadata' event
    if (this.destroyed) return

    if (this.skipVerify) {
      // Skip verifying exisitng data and just assume it's correct
      this._markAllVerified()
      this._onStore()
    } else {
      const onPiecesVerified = (err) => {
        if (err) return this._destroy(err)
        this._debug('done verifying')
        this._onStore()
      }

      this._debug('verifying existing torrent data')
      if (this._fileModtimes && this._store === HybridChunkStore) {
        // don't verify if the files haven't been modified since we last checked
        this.getFileModtimes((err, fileModtimes) => {
          if (err) return this._destroy(err)

          const unchanged = this.files.map((_, index) => fileModtimes[index] === this._fileModtimes[index]).every(x => x)

          if (unchanged) {
            this._markAllVerified()
            this._onStore()
          } else {
            this._verifyPieces(onPiecesVerified)
          }
        })
      } else {
        this._verifyPieces(onPiecesVerified)
      }
    }
  }

  /*
   * TODO: remove this
   * Gets the last modified time of every file on disk for this torrent.
   * Only valid in Node, not in the browser.
   */
  getFileModtimes (cb) {
    const ret = []
    run_parallel_limit(this.files.map((file, index) => cb => {
      const filePath = this.addUID ? path_browserify.join(this.name + ' - ' + this.infoHash.slice(0, 8)) : path_browserify.join(this.path, file.path)
      fs_ignored_0.stat(filePath, (err, stat) => {
        if (err && err.code !== 'ENOENT') return cb(err)
        ret[index] = stat && stat.mtime.getTime()
        cb(null)
      })
    }), FILESYSTEM_CONCURRENCY, err => {
      this._debug('done getting file modtimes')
      cb(err, ret)
    })
  }

  _verifyPieces (cb) {
    run_parallel_limit(this.pieces.map((piece, index) => cb => {
      if (this.destroyed) return cb(new Error('torrent is destroyed'))

      const getOpts = {}
      // Specify length for the last piece in case it is zero-padded
      if (index === this.pieces.length - 1) {
        getOpts.length = this.lastPieceLength
      }
      this.store.get(index, getOpts, async (err, buf) => {
        if (this.destroyed) return cb(new Error('torrent is destroyed'))

        if (err) return queue_microtask(() => cb(null)) // ignore error

        const hex = await (0,browser/* hash */.vp)(buf, 'hex')
        if (this.destroyed) return cb(new Error('torrent is destroyed'))

        if (hex === this._hashes[index]) {
          this._debug('piece verified %s', index)
          this._markVerified(index)
        } else {
          this._markUnverified(index)
          this._debug('piece invalid %s', index)
        }
        cb(null)
      })
    }), FILESYSTEM_CONCURRENCY, cb)
  }

  rescanFiles (cb) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (!cb) cb = torrent_noop

    this._verifyPieces((err) => {
      if (err) {
        this._destroy(err)
        return cb(err)
      }

      this._checkDone()
      cb(null)
    })
  }

  _markAllVerified () {
    for (let index = 0; index < this.pieces.length; index++) {
      this._markVerified(index)
    }
  }

  _markVerified (index) {
    this.pieces[index] = null
    this._reservations[index] = null
    this.bitfield.set(index, true)
  }

  _markUnverified (index) {
    const len = (index === this.pieces.length - 1)
      ? this.lastPieceLength
      : this.pieceLength
    this.pieces[index] = new torrent_piece(len)
    this.bitfield.set(index, false)
    this.select(index, index, 1)
    this.files.forEach(file => {
      if (file.done && file.includes(index)) file.done = false
    })
  }

  _hasAllPieces () {
    for (let index = 0; index < this.pieces.length; index++) {
      if (!this.bitfield.get(index)) return false
    }
    return true
  }

  _hasNoPieces () {
    return !this._hasMorePieces(0)
  }

  _hasMorePieces (threshold) {
    let count = 0
    for (let index = 0; index < this.pieces.length; index++) {
      if (this.bitfield.get(index)) {
        count += 1
        if (count > threshold) return true
      }
    }
    return false
  }

  /**
   * Called when the metadata, listening server, and underlying chunk store is initialized.
   */
  _onStore () {
    if (this.destroyed) return
    this._debug('on store')

    // Start discovery before emitting 'ready'
    this._startDiscovery()

    this.ready = true
    this.emit('ready')

    // Files may start out done if the file was already in the store
    this._checkDone()

    // In case any selections were made before torrent was ready
    this._updateSelections()

    // Start requesting pieces after we have initially verified them
    this.wires.forEach(wire => {
      // If we didn't have the metadata at the time ut_metadata was initialized for this
      // wire, we still want to make it available to the peer in case they request it.
      if (wire.ut_metadata) wire.ut_metadata.setMetadata(this.metadata)

      this._onWireWithMetadata(wire)
    })
  }

  destroy (opts, cb) {
    if (typeof opts === 'function') return this.destroy(null, opts)

    this._destroy(null, opts, cb)
  }

  _destroy (err, opts, cb) {
    if (typeof opts === 'function') return this._destroy(err, null, opts)
    if (this.destroyed) return
    this.destroyed = true
    this._debug('destroy')

    this.client._remove(this)

    clearInterval(this._rechokeIntervalId)

    clearInterval(this._noPeersIntervalId)

    this._xsRequestsController?.abort()

    if (this._rarityMap) {
      this._rarityMap.destroy()
    }

    for (const id in this._peers) {
      this.removePeer(id)
    }

    this.files.forEach(file => {
      if (file instanceof file_File) file._destroy()
    })

    const tasks = this._servers.map(server => cb => {
      server.destroy(cb)
    })

    if (this.discovery) {
      tasks.push(cb => {
        this.discovery.destroy(cb)
      })
    }

    if (this.store) {
      let destroyStore = this._destroyStoreOnDestroy
      if (opts && opts.destroyStore !== undefined) {
        destroyStore = opts.destroyStore
      }
      tasks.push(cb => {
        if (destroyStore) {
          this.store.destroy(cb)
        } else {
          this.store.close(cb)
        }
      })
    }

    run_parallel(tasks, cb)

    if (err) {
      // Torrent errors are emitted at `torrent.on('error')`. If there are no 'error'
      // event handlers on the torrent instance, then the error will be emitted at
      // `client.on('error')`. This prevents throwing an uncaught exception
      // (unhandled 'error' event), but it makes it impossible to distinguish client
      // errors versus torrent errors. Torrent errors are not fatal, and the client
      // is still usable afterwards. Therefore, always listen for errors in both
      // places (`client.on('error')` and `torrent.on('error')`).
      if (this.listenerCount('error') === 0) {
        this.client.emit('error', err)
      } else {
        this.emit('error', err)
      }
    }

    this.emit('close')

    this.client = null
    this.files = []
    this.discovery = null
    this.store = null
    this._rarityMap = null
    this._peers = null
    this._servers = null
    this._xsRequests = null
  }

  addPeer (peer, source) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (!this.infoHash) throw new Error('addPeer() must not be called before the `infoHash` event')

    let host

    if (this.client.blocked) {
      if (typeof peer === 'string') {
        let parts
        try {
          parts = addrToIPPort(peer)
        } catch (e) {
          this._debug('ignoring peer: invalid %s', peer)
          this.emit('invalidPeer', peer)
          return false
        }
        host = parts[0]
      } else if (typeof peer.remoteAddress === 'string') {
        host = peer.remoteAddress
      }

      if (host && this.client.blocked.contains(host)) {
        this._debug('ignoring peer: blocked %s', peer)
        if (typeof peer !== 'string') peer.destroy()
        this.emit('blockedPeer', peer)
        return false
      }
    }

    // if the utp connection fails to connect, then it is replaced with a tcp connection to the same ip:port

    const type = (this.client.utp && this._isIPv4(host)) ? 'utp' : 'tcp'
    const wasAdded = !!this._addPeer(peer, type, source)

    if (wasAdded) {
      this.emit('peer', peer)
    } else {
      this.emit('invalidPeer', peer)
    }
    return wasAdded
  }

  _addPeer (peer, type, source) {
    if (this.destroyed) {
      if (typeof peer !== 'string') peer.destroy()
      return null
    }
    if (typeof peer === 'string' && !this._validAddr(peer)) {
      this._debug('ignoring peer: invalid %s', peer)
      return null
    }

    const id = (peer && peer.id) || peer
    if (this._peers[id]) {
      this._debug('ignoring peer: duplicate (%s)', id)
      if (typeof peer !== 'string') peer.destroy()
      return null
    }

    if (this.paused) {
      this._debug('ignoring peer: torrent is paused')
      if (typeof peer !== 'string') peer.destroy()
      return null
    }

    this._debug('add peer %s', id)

    let newPeer
    if (typeof peer === 'string') {
      // `peer` is an addr ("ip:port" string)
      newPeer = type === 'utp'
        ? lib_peer["default"].createUTPOutgoingPeer(peer, this, this.client.throttleGroups)
        : lib_peer["default"].createTCPOutgoingPeer(peer, this, this.client.throttleGroups)
    } else {
      // `peer` is a WebRTC connection (simple-peer)
      newPeer = lib_peer["default"].createWebRTCPeer(peer, this, this.client.throttleGroups)
    }

    this._registerPeer(newPeer)

    if (typeof peer === 'string') {
      // `peer` is an addr ("ip:port" string)
      this._queue.push(newPeer)
      this._drain()
    }

    return newPeer
  }

  addWebSeed (urlOrConn) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    let id
    let conn
    if (typeof urlOrConn === 'string') {
      id = urlOrConn

      if (!/^https?:\/\/.+/.test(id)) {
        this.emit('warning', new Error(`ignoring invalid web seed: ${id}`))
        this.emit('invalidPeer', id)
        return
      }

      if (this._peers[id]) {
        this.emit('warning', new Error(`ignoring duplicate web seed: ${id}`))
        this.emit('invalidPeer', id)
        return
      }

      conn = new WebConn(id, this)
    } else if (urlOrConn && typeof urlOrConn.connId === 'string') {
      conn = urlOrConn
      id = conn.connId

      if (this._peers[id]) {
        this.emit('warning', new Error(`ignoring duplicate web seed: ${id}`))
        this.emit('invalidPeer', id)
        return
      }
    } else {
      this.emit('warning', new Error('addWebSeed must be passed a string or connection object with id property'))
      return
    }

    this._debug('add web seed %s', id)

    const newPeer = lib_peer["default"].createWebSeedPeer(conn, id, this, this.client.throttleGroups)

    this._registerPeer(newPeer)

    this.emit('peer', id)
  }

  /**
   * Called whenever a new incoming TCP peer connects to this torrent swarm. Called with a
   * peer that has already sent a handshake.
   */
  _addIncomingPeer (peer) {
    if (this.destroyed) return peer.destroy(new Error('torrent is destroyed'))
    if (this.paused) return peer.destroy(new Error('torrent is paused'))

    this._debug('add incoming peer %s', peer.id)

    this._registerPeer(peer)
  }

  _registerPeer (newPeer) {
    newPeer.on('download', downloaded => {
      if (this.destroyed) return
      this.received += downloaded
      this._downloadSpeed(downloaded)
      this.client._downloadSpeed(downloaded)
      this.emit('download', downloaded)
      if (this.destroyed) return
      this.client.emit('download', downloaded)
    })

    newPeer.on('upload', uploaded => {
      if (this.destroyed) return
      this.uploaded += uploaded
      this._uploadSpeed(uploaded)
      this.client._uploadSpeed(uploaded)
      this.emit('upload', uploaded)
      if (this.destroyed) return
      this.client.emit('upload', uploaded)
    })

    this._peers[newPeer.id] = newPeer
    this._peersLength += 1
  }

  removePeer (peer) {
    const id = peer?.id || peer
    if (peer && !peer.id) peer = this._peers?.[id]

    if (!peer) return
    peer.destroy()

    if (this.destroyed) return

    this._debug('removePeer %s', id)

    delete this._peers[id]
    this._peersLength -= 1

    // If torrent swarm was at capacity before, try to open a new connection now
    this._drain()
  }

  select (start, end, priority, notify) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    if (start < 0 || end < start || this.pieces.length <= end) {
      throw new Error(`invalid selection ${start} : ${end}`)
    }
    priority = Number(priority) || 0

    this._debug('select %s-%s (priority %s)', start, end, priority)

    this._selections.push({
      from: start,
      to: end,
      offset: 0,
      priority,
      notify: notify || torrent_noop
    })

    this._selections.sort((a, b) => b.priority - a.priority)

    this._updateSelections()
  }

  deselect (start, end, priority) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    priority = Number(priority) || 0
    this._debug('deselect %s-%s (priority %s)', start, end, priority)

    for (let i = 0; i < this._selections.length; ++i) {
      const s = this._selections[i]
      if (s.from === start && s.to === end && s.priority === priority) {
        this._selections.splice(i, 1)
        break
      }
    }

    this._updateSelections()
  }

  critical (start, end) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    this._debug('critical %s-%s', start, end)

    for (let i = start; i <= end; ++i) {
      this._critical[i] = true
    }

    this._updateSelections()
  }

  _onWire (wire, addr) {
    this._debug('got wire %s (%s)', wire._debugId, addr || 'Unknown')

    this.wires.push(wire)

    if (addr) {
      // Sometimes RTCPeerConnection.getStats() doesn't return an ip:port for peers
      const parts = addrToIPPort(addr)
      wire.remoteAddress = parts[0]
      wire.remotePort = parts[1]
    }

    // When peer sends PORT message, add that DHT node to routing table
    if (this.client.dht && this.client.dht.listening) {
      wire.on('port', port => {
        if (this.destroyed || this.client.dht.destroyed) {
          return
        }
        if (!wire.remoteAddress) {
          return this._debug('ignoring PORT from peer with no address')
        }
        if (port === 0 || port > 65536) {
          return this._debug('ignoring invalid PORT from peer')
        }

        this._debug('port: %s (from %s)', port, addr)
        this.client.dht.addNode({ host: wire.remoteAddress, port })
      })
    }

    wire.on('timeout', () => {
      this._debug('wire timeout (%s)', addr)
      // TODO: this might be destroying wires too eagerly
      wire.destroy()
    })

    // Timeout for piece requests to this peer
    if (wire.type !== 'webSeed') { // webseeds always send 'unhave' on http timeout
      wire.setTimeout(PIECE_TIMEOUT, true)
    }

    // Send KEEP-ALIVE (every 60s) so peers will not disconnect the wire
    wire.setKeepAlive(true)

    // use ut_metadata extension
    wire.use(ut_metadata(this.metadata))

    wire.ut_metadata.on('warning', err => {
      this._debug('ut_metadata warning: %s', err.message)
    })

    if (!this.metadata) {
      wire.ut_metadata.on('metadata', metadata => {
        this._debug('got metadata via ut_metadata')
        this._onMetadata(metadata)
      })
      wire.ut_metadata.fetch()
    }

    // use ut_pex extension if the torrent is not flagged as private
    if (this.client.utPex && typeof ut_pex_ignored_ === 'function' && !this.private) {
      wire.use(ut_pex_ignored_())

      wire.ut_pex.on('peer', peer => {
        // Only add potential new peers when we're not seeding
        if (this.done) return
        this._debug('ut_pex: got peer: %s (from %s)', peer, addr)
        this.addPeer(peer, lib_peer["default"].SOURCE_UT_PEX)
      })

      wire.ut_pex.on('dropped', peer => {
        // the remote peer believes a given peer has been dropped from the torrent swarm.
        // if we're not currently connected to it, then remove it from the queue.
        const peerObj = this._peers[peer]
        if (peerObj && !peerObj.connected) {
          this._debug('ut_pex: dropped peer: %s (from %s)', peer, addr)
          this.removePeer(peer)
        }
      })

      wire.once('close', () => {
        // Stop sending updates to remote peer
        wire.ut_pex.reset()
      })
    }

    wire.use(lt_donthave())

    // Hook to allow user-defined `bittorrent-protocol` extensions
    // More info: https://github.com/webtorrent/bittorrent-protocol#extension-api
    this.emit('wire', wire, addr)

    if (this.ready) {
      queue_microtask(() => {
        // This allows wire.handshake() to be called (by Peer.onHandshake) before any
        // messages get sent on the wire
        this._onWireWithMetadata(wire)
      })
    }
  }

  _onWireWithMetadata (wire) {
    let timeoutId = null

    const onChokeTimeout = () => {
      if (this.destroyed || wire.destroyed) return

      if (this._numQueued > 2 * (this._numConns - this.numPeers) &&
        wire.amInterested) {
        wire.destroy()
      } else {
        timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
        if (timeoutId.unref) timeoutId.unref()
      }
    }

    let i
    const updateSeedStatus = () => {
      if (wire.peerPieces.buffer.length !== this.bitfield.buffer.length) return
      for (i = 0; i < this.pieces.length; ++i) {
        if (!wire.peerPieces.get(i)) return
      }
      wire.isSeeder = true
      wire.choke() // always choke seeders
    }

    wire.on('bitfield', () => {
      updateSeedStatus()
      this._update()
      this._updateWireInterest(wire)
    })

    wire.on('have', () => {
      updateSeedStatus()
      this._update()
      this._updateWireInterest(wire)
    })

    wire.lt_donthave.on('donthave', () => {
      updateSeedStatus()
      this._update()
      this._updateWireInterest(wire)
    })

    // fast extension (BEP6)
    wire.on('have-all', () => {
      wire.isSeeder = true
      wire.choke() // always choke seeders
      this._update()
      this._updateWireInterest(wire)
    })

    // fast extension (BEP6)
    wire.on('have-none', () => {
      wire.isSeeder = false
      this._update()
      this._updateWireInterest(wire)
    })

    // fast extension (BEP6)
    wire.on('allowed-fast', (index) => {
      this._update()
    })

    wire.once('interested', () => {
      wire.unchoke()
    })

    wire.once('close', () => {
      clearTimeout(timeoutId)
    })

    wire.on('choke', () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
      if (timeoutId.unref) timeoutId.unref()
    })

    wire.on('unchoke', () => {
      clearTimeout(timeoutId)
      this._update()
    })

    wire.on('request', (index, offset, length, cb) => {
      if (length > MAX_BLOCK_LENGTH) {
        // Per spec, disconnect from peers that request >128KB
        return wire.destroy()
      }
      if (this.pieces[index]) return
      this.store.get(index, { offset, length }, cb)
    })

    // always send bitfield or equivalent fast extension message (required)
    if (wire.hasFast && this._hasAllPieces()) wire.haveAll()
    else if (wire.hasFast && this._hasNoPieces()) wire.haveNone()
    else wire.bitfield(this.bitfield)

    // initialize interest in case bitfield message was already received before above handler was registered
    this._updateWireInterest(wire)

    // Send PORT message to peers that support DHT
    if (wire.peerExtensions.dht && this.client.dht && this.client.dht.listening) {
      wire.port(this.client.dht.address().port)
    }

    if (wire.type !== 'webSeed') { // do not choke on webseeds
      timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
      if (timeoutId.unref) timeoutId.unref()
    }

    wire.isSeeder = false
    updateSeedStatus()
  }

  /**
   * Called on selection changes.
   */
  _updateSelections () {
    if (!this.ready || this.destroyed) return

    queue_microtask(() => {
      this._gcSelections()
    })
    this._updateInterest()
    this._update()
  }

  /**
   * Garbage collect selections with respect to the store's current state.
   */
  _gcSelections () {
    for (let i = 0; i < this._selections.length; ++i) {
      const s = this._selections[i]
      const oldOffset = s.offset

      // check for newly downloaded pieces in selection
      while (this.bitfield.get(s.from + s.offset) && s.from + s.offset < s.to) {
        s.offset += 1
      }

      if (oldOffset !== s.offset) s.notify()
      if (s.to !== s.from + s.offset) continue
      if (!this.bitfield.get(s.from + s.offset)) continue

      this._selections.splice(i, 1) // remove fully downloaded selection
      i -= 1 // decrement i to offset splice

      s.notify()
      this._updateInterest()
    }

    if (!this._selections.length) this.emit('idle')
  }

  /**
   * Update interested status for all peers.
   */
  _updateInterest () {
    const prev = this._amInterested
    this._amInterested = !!this._selections.length

    this.wires.forEach(wire => this._updateWireInterest(wire))

    if (prev === this._amInterested) return
    if (this._amInterested) this.emit('interested')
    else this.emit('uninterested')
  }

  _updateWireInterest (wire) {
    let interested = false
    for (let index = 0; index < this.pieces.length; ++index) {
      if (this.pieces[index] && wire.peerPieces.get(index)) {
        interested = true
        break
      }
    }

    if (interested) wire.interested()
    else wire.uninterested()
  }

  /**
   * Heartbeat to update all peers and their requests.
   */
  _update () {
    if (this.destroyed) return

    // update wires in random order for better request distribution
    const ite = random_iterate(this.wires)
    let wire
    while ((wire = ite())) {
      this._updateWireWrapper(wire)
    }
  }

  _updateWireWrapper (wire) {
    const self = this

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => { self._updateWire(wire) }, { timeout: 250 })
    } else {
      self._updateWire(wire)
    }
  }

  /**
   * Attempts to update a peer's requests
   */
  _updateWire (wire) {
    if (wire.destroyed) return false
    // to allow function hoisting
    const self = this

    const minOutstandingRequests = getBlockPipelineLength(wire, PIPELINE_MIN_DURATION)
    if (wire.requests.length >= minOutstandingRequests) return
    const maxOutstandingRequests = getBlockPipelineLength(wire, PIPELINE_MAX_DURATION)

    if (wire.peerChoking) {
      if (wire.hasFast && wire.peerAllowedFastSet.length > 0 &&
        !this._hasMorePieces(wire.peerAllowedFastSet.length - 1)) {
        requestAllowedFastSet()
      }
      return
    }

    if (!wire.downloaded) return validateWire()

    trySelectWire(false) || trySelectWire(true)

    function requestAllowedFastSet () {
      if (wire.requests.length >= maxOutstandingRequests) return false

      for (const piece of wire.peerAllowedFastSet) {
        if (wire.peerPieces.get(piece) && !self.bitfield.get(piece)) {
          while (self._request(wire, piece, false) &&
            wire.requests.length < maxOutstandingRequests) {
            // body intentionally empty
            // request all non-reserved blocks in this piece
          }
        }

        if (wire.requests.length < maxOutstandingRequests) continue

        return true
      }

      return false
    }

    function genPieceFilterFunc (start, end, tried, rank) {
      return i => i >= start && i <= end && !(i in tried) && wire.peerPieces.get(i) && (!rank || rank(i))
    }

    // TODO: Do we need both validateWire and trySelectWire?
    function validateWire () {
      if (wire.requests.length) return

      let i = self._selections.length
      while (i--) {
        const next = self._selections[i]
        let piece
        if (self.strategy === 'rarest') {
          const start = next.from + next.offset
          const end = next.to
          const len = end - start + 1
          const tried = {}
          let tries = 0
          const filter = genPieceFilterFunc(start, end, tried)

          while (tries < len) {
            piece = self._rarityMap.getRarestPiece(filter)
            if (piece < 0) break
            if (self._request(wire, piece, false)) return
            tried[piece] = true
            tries += 1
          }
        } else {
          for (piece = next.to; piece >= next.from + next.offset; --piece) {
            if (!wire.peerPieces.get(piece)) continue
            if (self._request(wire, piece, false)) return
          }
        }
      }

      // TODO: wire failed to validate as useful; should we close it?
      // probably not, since 'have' and 'bitfield' messages might be coming
    }

    function speedRanker () {
      const speed = wire.downloadSpeed() || 1
      if (speed > SPEED_THRESHOLD) return () => true

      const secs = Math.max(1, wire.requests.length) * torrent_piece.BLOCK_LENGTH / speed
      let tries = 10
      let ptr = 0

      return index => {
        if (!tries || self.bitfield.get(index)) return true

        let missing = self.pieces[index].missing

        for (; ptr < self.wires.length; ptr++) {
          const otherWire = self.wires[ptr]
          const otherSpeed = otherWire.downloadSpeed()

          if (otherSpeed < SPEED_THRESHOLD) continue
          if (otherSpeed <= speed) continue
          if (!otherWire.peerPieces.get(index)) continue
          if ((missing -= otherSpeed * secs) > 0) continue

          tries--
          return false
        }

        return true
      }
    }

    function shufflePriority (i) {
      let last = i
      for (let j = i; j < self._selections.length && self._selections[j].priority; j++) {
        last = j
      }
      const tmp = self._selections[i]
      self._selections[i] = self._selections[last]
      self._selections[last] = tmp
    }

    function trySelectWire (hotswap) {
      if (wire.requests.length >= maxOutstandingRequests) return true
      const rank = speedRanker()

      for (let i = 0; i < self._selections.length; i++) {
        const next = self._selections[i]

        let piece
        if (self.strategy === 'rarest') {
          const start = next.from + next.offset
          const end = next.to
          const len = end - start + 1
          const tried = {}
          let tries = 0
          const filter = genPieceFilterFunc(start, end, tried, rank)

          while (tries < len) {
            piece = self._rarityMap.getRarestPiece(filter)
            if (piece < 0) break

            while (self._request(wire, piece, self._critical[piece] || hotswap) &&
              wire.requests.length < maxOutstandingRequests) {
              // body intentionally empty
              // request all non-reserved blocks in this piece
            }

            if (wire.requests.length < maxOutstandingRequests) {
              tried[piece] = true
              tries++
              continue
            }

            if (next.priority) shufflePriority(i)
            return true
          }
        } else {
          for (piece = next.from + next.offset; piece <= next.to; piece++) {
            if (!wire.peerPieces.get(piece) || !rank(piece)) continue

            while (self._request(wire, piece, self._critical[piece] || hotswap) &&
              wire.requests.length < maxOutstandingRequests) {
              // body intentionally empty
              // request all non-reserved blocks in piece
            }

            if (wire.requests.length < maxOutstandingRequests) continue

            if (next.priority) shufflePriority(i)
            return true
          }
        }
      }

      return false
    }
  }

  /**
   * Called periodically to update the choked status of all peers, handling optimistic
   * unchoking as described in BEP3.
   */
  _rechoke () {
    if (!this.ready) return

    // wires in increasing order of quality (pop() gives next best peer)
    const wireStack =
      this.wires
        .map(wire => ({ wire, random: Math.random() })) // insert a random seed for randomizing the sort
        .sort((objA, objB) => {
          const wireA = objA.wire
          const wireB = objB.wire

          // prefer peers that send us data faster
          if (wireA.downloadSpeed() !== wireB.downloadSpeed()) {
            return wireA.downloadSpeed() - wireB.downloadSpeed()
          }

          // then prefer peers that can download data from us faster
          if (wireA.uploadSpeed() !== wireB.uploadSpeed()) {
            return wireA.uploadSpeed() - wireB.uploadSpeed()
          }

          // then prefer already unchoked peers (to minimize fibrillation)
          if (wireA.amChoking !== wireB.amChoking) {
            return wireA.amChoking ? -1 : 1 // choking < unchoked
          }

          // otherwise random order
          return objA.random - objB.random
        })
        .map(obj => obj.wire) // return array of wires (remove random seed)

    if (this._rechokeOptimisticTime <= 0) {
      // clear old optimistic peer, so it can be rechoked normally and then replaced
      this._rechokeOptimisticWire = null
    } else {
      this._rechokeOptimisticTime -= 1
    }

    let numInterestedUnchoked = 0
    // leave one rechoke slot open for optimistic unchoking
    while (wireStack.length > 0 && numInterestedUnchoked < this._rechokeNumSlots - 1) {
      const wire = wireStack.pop() // next best quality peer

      if (wire.isSeeder || wire === this._rechokeOptimisticWire) {
        continue
      }

      wire.unchoke()

      // only stop unchoking once we fill the slots with interested peers that will actually download
      if (wire.peerInterested) {
        numInterestedUnchoked++
      }
    }

    // fill optimistic unchoke slot if empty
    if (this._rechokeOptimisticWire === null && this._rechokeNumSlots > 0) {
      // don't optimistically unchoke uninterested peers
      const remaining = wireStack.filter(wire => wire.peerInterested)

      if (remaining.length > 0) {
        // select random remaining (not yet unchoked) peer
        const newOptimisticPeer = remaining[randomInt(remaining.length)]

        newOptimisticPeer.unchoke()

        this._rechokeOptimisticWire = newOptimisticPeer

        this._rechokeOptimisticTime = RECHOKE_OPTIMISTIC_DURATION
      }
    }

    // choke the rest
    wireStack
      .filter(wire => wire !== this._rechokeOptimisticWire) // except the optimistically unchoked peer
      .forEach(wire => wire.choke())
  }

  /**
   * Attempts to cancel a slow block request from another wire such that the
   * given wire may effectively swap out the request for one of its own.
   */
  _hotswap (wire, index) {
    const speed = wire.downloadSpeed()
    if (speed < torrent_piece.BLOCK_LENGTH) return false
    if (!this._reservations[index]) return false

    const r = this._reservations[index]
    if (!r) {
      return false
    }

    let minSpeed = Infinity
    let minWire

    let i
    for (i = 0; i < r.length; i++) {
      const otherWire = r[i]
      if (!otherWire || otherWire === wire) continue

      const otherSpeed = otherWire.downloadSpeed()
      if (otherSpeed >= SPEED_THRESHOLD) continue
      if (2 * otherSpeed > speed || otherSpeed > minSpeed) continue

      minWire = otherWire
      minSpeed = otherSpeed
    }

    if (!minWire) return false

    for (i = 0; i < r.length; i++) {
      if (r[i] === minWire) r[i] = null
    }

    for (i = 0; i < minWire.requests.length; i++) {
      const req = minWire.requests[i]
      if (req.piece !== index) continue

      this.pieces[index].cancel((req.offset / torrent_piece.BLOCK_LENGTH) | 0)
    }

    this.emit('hotswap', minWire, wire, index)
    return true
  }

  /**
   * Attempts to request a block from the given wire.
   */
  _request (wire, index, hotswap) {
    const self = this
    const numRequests = wire.requests.length
    const isWebSeed = wire.type === 'webSeed'

    if (self.bitfield.get(index)) return false

    const maxOutstandingRequests = isWebSeed
      ? Math.min(
        getPiecePipelineLength(wire, PIPELINE_MAX_DURATION, self.pieceLength),
        self.maxWebConns
      )
      : getBlockPipelineLength(wire, PIPELINE_MAX_DURATION)

    if (numRequests >= maxOutstandingRequests) return false
    // var endGame = (wire.requests.length === 0 && self.store.numMissing < 30)

    const piece = self.pieces[index]
    let reservation = isWebSeed ? piece.reserveRemaining() : piece.reserve()

    if (reservation === -1 && hotswap && self._hotswap(wire, index)) {
      reservation = isWebSeed ? piece.reserveRemaining() : piece.reserve()
    }
    if (reservation === -1) return false

    let r = self._reservations[index]
    if (!r) r = self._reservations[index] = []
    let i = r.indexOf(null)
    if (i === -1) i = r.length
    r[i] = wire

    const chunkOffset = piece.chunkOffset(reservation)
    const chunkLength = isWebSeed ? piece.chunkLengthRemaining(reservation) : piece.chunkLength(reservation)

    wire.request(index, chunkOffset, chunkLength, async function onChunk (err, chunk) {
      if (self.destroyed) return

      // TODO: what is this for?
      if (!self.ready) return self.once('ready', () => { onChunk(err, chunk) })

      if (r[i] === wire) r[i] = null

      if (piece !== self.pieces[index]) return onUpdateTick()

      if (err) {
        self._debug(
          'error getting piece %s (offset: %s length: %s) from %s: %s',
          index, chunkOffset, chunkLength, `${wire.remoteAddress}:${wire.remotePort}`,
          err.message
        )
        isWebSeed ? piece.cancelRemaining(reservation) : piece.cancel(reservation)
        onUpdateTick()
        return
      }

      self._debug(
        'got piece %s (offset: %s length: %s) from %s',
        index, chunkOffset, chunkLength, `${wire.remoteAddress}:${wire.remotePort}`
      )

      if (!piece.set(reservation, chunk, wire)) return onUpdateTick()

      const buf = piece.flush()

      // TODO: might need to set self.pieces[index] = null here since sha1 is async

      const hex = await (0,browser/* hash */.vp)(buf, 'hex')
      if (self.destroyed) return

      if (hex === self._hashes[index]) {
        self._debug('piece verified %s', index)

        self.store.put(index, buf, err => {
          if (err) {
            self._destroy(err)
            return
          } else {
            self.pieces[index] = null
            self._markVerified(index)
            self.wires.forEach(wire => {
              wire.have(index)
            })
          }
          // We also check `self.destroyed` since `torrent.destroy()` could have been
          // called in the `torrent.on('done')` handler, triggered by `_checkDone()`.
          if (self._checkDone() && !self.destroyed) self.discovery.complete()
          onUpdateTick()
        })
      } else {
        self.pieces[index] = new torrent_piece(piece.length)
        self.emit('warning', new Error(`Piece ${index} failed verification`))
        onUpdateTick()
      }
    })

    function onUpdateTick () {
      queue_microtask(() => { self._update() })
    }

    return true
  }

  _checkDone () {
    if (this.destroyed) return

    // are any new files done?
    this.files.forEach(file => {
      if (file.done) return
      for (let i = file._startPiece; i <= file._endPiece; ++i) {
        if (!this.bitfield.get(i)) return
      }
      file.done = true
      file.emit('done')
      this._debug(`file done: ${file.name}`)
    })

    // is the torrent done? (if all current selections are satisfied, or there are
    // no selections, then torrent is done)
    let done = true

    for (const selection of this._selections) {
      for (let piece = selection.from; piece <= selection.to; piece++) {
        if (!this.bitfield.get(piece)) {
          done = false
          break
        }
      }
      if (!done) break
    }

    if (!this.done && done) {
      this.done = true
      this._debug(`torrent done: ${this.infoHash}`)
      this.emit('done')
    } else {
      this.done = false
    }
    this._gcSelections()

    return done
  }

  async load (streams, cb) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (!this.ready) return this.once('ready', () => { this.load(streams, cb) })

    if (!Array.isArray(streams)) streams = [streams]
    if (!cb) cb = torrent_noop

    try {
      await chunkStoreWrite(this.store, join_async_iterator(streams), { chunkLength: this.pieceLength })
      this._markAllVerified()
      this._checkDone()
      cb(null)
    } catch (err) {
      cb(err)
      return err
    }
  }

  pause () {
    if (this.destroyed) return
    this._debug('pause')
    this.paused = true
  }

  resume () {
    if (this.destroyed) return
    this._debug('resume')
    this.paused = false
    this._drain()
  }

  _debug () {
    const args = [].slice.call(arguments)
    args[0] = `[${this.client ? this.client._debugId : 'No Client'}] [${this._debugId}] ${args[0]}`
    torrent_debug(...args)
  }

  /**
   * Pop a peer off the FIFO queue and connect to it. When _drain() gets called,
   * the queue will usually have only one peer in it, except when there are too
   * many peers (over `this.maxConns`) in which case they will just sit in the
   * queue until another connection closes.
   */
  _drain () {
    this._debug('_drain numConns %s maxConns %s', this._numConns, this.client.maxConns)
    if (typeof net_ignored_.connect !== 'function' || this.destroyed || this.paused ||
        this._numConns >= this.client.maxConns) {
      return
    }
    this._debug('drain (%s queued, %s/%s peers)', this._numQueued, this.numPeers, this.client.maxConns)

    const peer = this._queue.shift()
    if (!peer) return // queue could be empty

    this._debug('%s connect attempt to %s', peer.type, peer.addr)

    const parts = addrToIPPort(peer.addr)
    const opts = {
      host: parts[0],
      port: parts[1]
    }

    if (this.client.utp && peer.type === lib_peer["default"].TYPE_UTP_OUTGOING) {
      peer.conn = utp_ignored_.connect(opts.port, opts.host)
    } else {
      peer.conn = net_ignored_.connect(opts)
    }

    const conn = peer.conn

    conn.once('connect', () => { if (!this.destroyed) peer.onConnect() })
    conn.once('error', err => { peer.destroy(err) })
    peer.startConnectTimeout()

    // When connection closes, attempt reconnect after timeout (with exponential backoff)
    conn.on('close', () => {
      if (this.destroyed) return

      if (peer.retries >= RECONNECT_WAIT.length) {
        if (this.client.utp) {
          const newPeer = this._addPeer(peer.addr, 'tcp', peer.source)
          if (newPeer) newPeer.retries = 0
        } else {
          this._debug(
            'conn %s closed: will not re-add (max %s attempts)',
            peer.addr, RECONNECT_WAIT.length
          )
        }
        return
      }

      const ms = RECONNECT_WAIT[peer.retries]
      this._debug(
        'conn %s closed: will re-add to queue in %sms (attempt %s)',
        peer.addr, ms, peer.retries + 1
      )

      const reconnectTimeout = setTimeout(() => {
        if (this.destroyed) return
        const host = addrToIPPort(peer.addr)[0]
        const type = (this.client.utp && this._isIPv4(host)) ? 'utp' : 'tcp'
        const newPeer = this._addPeer(peer.addr, type, peer.source)
        if (newPeer) newPeer.retries = peer.retries + 1
      }, ms)
      if (reconnectTimeout.unref) reconnectTimeout.unref()
    })
  }

  /**
   * Returns `true` if string is valid IPv4/6 address.
   * @param {string} addr
   * @return {boolean}
   */
  _validAddr (addr) {
    let parts
    try {
      parts = addrToIPPort(addr)
    } catch (e) {
      return false
    }
    const host = parts[0]
    const port = parts[1]
    return port > 0 && port < 65535 &&
      !(host === '127.0.0.1' && port === this.client.torrentPort)
  }

  /**
   * Return `true` if string is a valid IPv4 address.
   * @param {string} addr
   * @return {boolean}
   */
  _isIPv4 (addr) {
    const IPv4Pattern = /^((?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])[.]){3}(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$/
    return IPv4Pattern.test(addr)
  }
}

function getBlockPipelineLength (wire, duration) {
  let length = 2 + Math.ceil(duration * wire.downloadSpeed() / torrent_piece.BLOCK_LENGTH)

  // Honor reqq (maximum number of outstanding request messages) if specified by peer
  if (wire.peerExtendedHandshake) {
    const reqq = wire.peerExtendedHandshake.reqq
    if (typeof reqq === 'number' && reqq > 0) {
      length = Math.min(length, reqq)
    }
  }

  return length
}

function getPiecePipelineLength (wire, duration, pieceLength) {
  return 1 + Math.ceil(duration * wire.downloadSpeed() / pieceLength)
}

/**
 * Returns a random integer in [0,high)
 */
function randomInt (high) {
  return Math.random() * high | 0
}

function torrent_noop () {}

// EXTERNAL MODULE: http (ignored)
var http_ignored_ = __webpack_require__(3423);
// EXTERNAL MODULE: ./node_modules/escape-html/index.js
var escape_html = __webpack_require__(5573);
// EXTERNAL MODULE: ./node_modules/pump/index.js
var pump = __webpack_require__(4286);
// EXTERNAL MODULE: ./node_modules/range-parser/index.js
var range_parser = __webpack_require__(4622);
;// CONCATENATED MODULE: ./lib/server.js







const keepAliveTime = 20000

class ServerBase {
  constructor (client, opts = {}) {
    this.client = client
    if (!opts.origin) opts.origin = '*' // allow all origins by default
    this.opts = opts
    this.pendingReady = new Set()
  }

  static serveIndexPage (res, torrents, pathname) {
    const listHtml = torrents
      .map(torrent => (
      `<li>
        <a href="${escape_html(pathname)}/${torrent.infoHash}">
          ${escape_html(torrent.name)}
        </a>
        (${escape_html(torrent.length)} bytes)
      </li>`
      ))
      .join('<br>')

    res.status = 200
    res.headers['Content-Type'] = 'text/html'
    res.body = getPageHTML(
      'WebTorrent',
        `<h1>WebTorrent</h1>
         <ol>${listHtml}</ol>`
    )

    return res
  }

  isOriginAllowed (req) {
    // When `origin` option is `false`, deny all cross-origin requests
    if (this.opts.origin === false) return false

    // The user allowed all origins
    if (this.opts.origin === '*') return true

    // Allow requests where the 'Origin' header matches the `opts.origin` setting
    return req.headers.origin === this.opts.origin
  }

  static serveMethodNotAllowed (res) {
    res.status = 405
    res.headers['Content-Type'] = 'text/html'

    res.body = getPageHTML(
      '405 - Method Not Allowed',
      '<h1>405 - Method Not Allowed</h1>'
    )

    return res
  }

  static serve404Page (res) {
    res.status = 404
    res.headers['Content-Type'] = 'text/html'

    res.body = getPageHTML(
      '404 - Not Found',
      '<h1>404 - Not Found</h1>'
    )
    return res
  }

  static serveTorrentPage (torrent, res, pathname) {
    const listHtml = torrent.files
      .map(file => (
    `<li>
      <a href="${escape_html(pathname)}/${torrent.infoHash}/${escape_html(file.path)}">
        ${escape_html(file.path)}
      </a>
      (${escape_html(file.length)} bytes)
    </li>`
      ))
      .join('<br>')

    res.status = 200
    res.headers['Content-Type'] = 'text/html'

    res.body = getPageHTML(
        `${escape_html(torrent.name)} - WebTorrent`,
        `<h1>${escape_html(torrent.name)}</h1>
        <ol>${listHtml}</ol>`
    )

    return res
  }

  static serveOptionsRequest (req, res) {
    res.status = 204 // no content
    res.headers['Access-Control-Max-Age'] = '600'
    res.headers['Access-Control-Allow-Methods'] = 'GET,HEAD'

    if (req.headers['access-control-request-headers']) {
      res.headers['Access-Control-Allow-Headers'] = req.headers['access-control-request-headers']
    }
    return res
  }

  static serveFile (file, req, res) {
    res.status = 200

    // Disable caching as data is local anyways
    res.headers.Expires = '0'
    res.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    // Support range-requests
    res.headers['Accept-Ranges'] = 'bytes'
    res.headers['Content-Type'] = file.type
    // Support DLNA streaming
    res.headers['transferMode.dlna.org'] = 'Streaming'
    res.headers['contentFeatures.dlna.org'] = 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000'

    // Force the browser to download the file if if it's opened in a new tab
    // Set name of file (for "Save Page As..." dialog)
    if (req.destination === 'document') {
      res.headers['Content-Type'] = 'application/octet-stream'
      res.headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeRFC5987(file.name)}`
      res.body = 'DOWNLOAD'
    } else {
      res.headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeRFC5987(file.name)}`
    }

    // `rangeParser` returns an array of ranges, or an error code (number) if
    // there was an error parsing the range.
    let range = range_parser(file.length, req.headers.range || '')

    if (Array.isArray(range)) {
      res.status = 206 // indicates that range-request was understood

      // no support for multi-range request, just use the first range
      range = range[0]

      res.headers['Content-Range'] = `bytes ${range.start}-${range.end}/${file.length}`

      res.headers['Content-Length'] = range.end - range.start + 1
    } else {
      res.statusCode = 200
      range = null
      res.headers['Content-Length'] = file.length
    }

    if (req.method === 'GET') {
      const iterator = file[Symbol.asyncIterator](range)
      let transform = null
      file.emit('iterator', { iterator, req, file }, target => {
        transform = target
      })

      const stream = streamx.Readable.from(transform || iterator)
      let pipe = null
      file.emit('stream', { stream, req, file }, target => {
        pipe = pump(stream, target)
      })

      res.body = pipe || stream
    } else {
      res.body = false
    }
    return res
  }

  async onRequest (req, cb) {
    let pathname = new URL(req.url, 'http://example.com').pathname
    pathname = pathname.slice(pathname.indexOf(this.pathname) + this.pathname.length + 1)

    const res = {
      headers: {
        // Prevent browser mime-type sniffing
        'X-Content-Type-Options': 'nosniff',
        // Defense-in-depth: Set a strict Content Security Policy to mitigate XSS
        'Content-Security-Policy': "base-uri 'none'; frame-ancestors 'none'; form-action 'none';"
      }
    }

    // Allow cross-origin requests (CORS)
    if (this.isOriginAllowed(req)) {
      res.headers['Access-Control-Allow-Origin'] = this.opts.origin === '*' ? '*' : req.headers.origin
    }

    if (pathname === 'favicon.ico') {
      return cb(ServerBase.serve404Page(res))
    }

    // Allow CORS requests to specify arbitrary headers, e.g. 'Range',
    // by responding to the OPTIONS preflight request with the specified
    // origin and requested headers.
    if (req.method === 'OPTIONS') {
      if (this.isOriginAllowed(req)) return cb(ServerBase.serveOptionsRequest(req, res))
      else return cb(ServerBase.serveMethodNotAllowed(res))
    }

    const onReady = async () => {
      this.pendingReady.delete(onReady)
      const res = await handleRequest()
      cb(res)
    }

    const handleRequest = async () => {
      if (pathname === '') {
        return ServerBase.serveIndexPage(res, this.client.torrents, this.pathname)
      }

      let [infoHash, ...filePath] = pathname.split('/')
      filePath = decodeURI(filePath.join('/'))

      const torrent = await this.client.get(infoHash)
      if (!infoHash || !torrent) {
        return ServerBase.serve404Page(res)
      }

      if (!filePath) {
        return ServerBase.serveTorrentPage(torrent, res, this.pathname)
      }

      const file = torrent.files.find(file => file.path.replace(/\\/g, '/') === filePath)
      if (!file) {
        return ServerBase.serve404Page(res)
      }
      return ServerBase.serveFile(file, req, res)
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      if (this.client.ready) {
        const res = await handleRequest()
        return cb(res)
      } else {
        this.pendingReady.add(onReady)
        this.client.once('ready', onReady)
        return
      }
    }

    return ServerBase.serveMethodNotAllowed(res)
  }

  close (cb = () => {}) {
    this.closed = true
    this.pendingReady.forEach(onReady => {
      this.client.removeListener('ready', onReady)
    })
    this.pendingReady.clear()
    queue_microtask(cb)
  }

  destroy (cb = () => {}) {
    // Only call `server.close` if user has not called it already
    if (this.closed) queue_microtask(cb)
    else this.close(cb)
    this.client = null
  }
}

class NodeServer extends ServerBase {
  constructor (client, opts) {
    super(client, opts)

    this.server = http_ignored_.createServer()
    this._listen = this.server.listen
    this.server.listen = this.listen.bind(this)
    this._close = this.server.close
    this.server.close = this.close.bind(this)

    this.sockets = new Set()
    this.closed = false
    this.pathname = opts?.pathname || '/webtorrent'
  }

  wrapRequest (req, res) {
    // If a 'hostname' string is specified, deny requests with a 'Host'
    // header that does not match the origin of the torrent server to prevent
    // DNS rebinding attacks.
    if (this.opts.hostname && req.headers.host !== `${this.opts.hostname}:${this.server.address().port}`) {
      return req.destroy()
    }

    if (!new URL(req.url, 'http://example.com').pathname.startsWith(this.pathname)) {
      return req.destroy()
    }

    this.onRequest(req, ({ status, headers, body }) => {
      res.writeHead(status, headers)

      if (body instanceof streamx.Readable) { // this is probably a bad way of checking? idk
        pump(body, res)
      } else {
        res.end(body)
      }
    })
  }

  onConnection (socket) {
    socket.setTimeout(36000000)
    this.sockets.add(socket)
    socket.once('close', () => {
      this.sockets.delete(socket)
    })
  }

  address () {
    return this.server.address()
  }

  listen (...args) {
    this.closed = false
    this.server.on('connection', this.onConnection.bind(this))
    this.server.on('request', this.wrapRequest.bind(this))
    return this._listen.apply(this.server, args)
  }

  close (cb = () => {}) {
    this.server.removeAllListeners('connection')
    this.server.removeAllListeners('request')
    super.close()
    this._close.call(this.server, cb)
  }

  destroy (cb) {
    this.sockets.forEach(socket => {
      socket.destroy()
    })
    super.destroy(cb)
  }
}

class BrowserServer extends ServerBase {
  constructor (client, opts) {
    super(client, opts)

    this.registration = opts.controller
    this.workerKeepAliveInterval = null
    this.workerPortCount = 0

    const scope = new URL(opts.controller.scope)
    this.pathname = scope.pathname + 'webtorrent'
    this._address = {
      port: scope.port,
      family: 'IPv4', // might be a bad idea?
      address: scope.hostname
    }

    this.boundHandler = this.wrapRequest.bind(this)
    navigator.serviceWorker.addEventListener('message', this.boundHandler)
    // test if browser supports cancelling sw Readable Streams
    fetch(`${this.pathname}/cancel/`).then(res => {
      res.body.cancel()
    })
  }

  wrapRequest (event) {
    const req = event.data

    if (!req?.type === 'webtorrent' || !req.url) return null

    const [port] = event.ports
    this.onRequest(req, ({ status, headers, body }) => {
      const asyncIterator = body instanceof streamx.Readable && body[Symbol.asyncIterator]()

      const cleanup = () => {
        port.onmessage = null
        if (body?.destroy) body.destroy()
        this.workerPortCount--
        if (!this.workerPortCount) {
          clearInterval(this.workerKeepAliveInterval)
          this.workerKeepAliveInterval = null
        }
      }

      port.onmessage = async msg => {
        if (msg.data) {
          let chunk
          try {
            chunk = (await asyncIterator.next()).value
          } catch (e) {
            // chunk is yet to be downloaded or it somehow failed, should this be logged?
          }
          port.postMessage(chunk)
          if (!chunk) cleanup()
          if (!this.workerKeepAliveInterval) {
            this.workerKeepAliveInterval = setInterval(() => fetch(`${this.pathname}/keepalive/`), keepAliveTime)
          }
        } else {
          cleanup()
        }
      }
      this.workerPortCount++
      port.postMessage({
        status,
        headers,
        body: asyncIterator ? 'STREAM' : body
      })
    })
  }

  // for compatibility with node version
  listen (_, cb) {
    cb()
  }

  address () {
    return this._address
  }

  close (cb) {
    navigator.serviceWorker.removeEventListener('message', this.boundHandler)
    super.close(cb)
  }

  destroy (cb) {
    super.destroy(cb)
  }
}

// NOTE: Arguments must already be HTML-escaped
function getPageHTML (title, pageHtml) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
      </head>
      <body>
        ${pageHtml}
      </body>
    </html>
  `
}

// From https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
function encodeRFC5987 (str) {
  return encodeURIComponent(str)
    // Note that although RFC3986 reserves "!", RFC5987 does not,
    // so we do not need to escape it
    .replace(/['()]/g, escape) // i.e., %27 %28 %29
    .replace(/\*/g, '%2A')
    // The following are not required for percent-encoding per RFC5987,
    // so we can allow for a little better readability over the wire: |`^
    .replace(/%(?:7C|60|5E)/g, unescape)
}



;// CONCATENATED MODULE: ./index.js
/*! webtorrent. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */





 // browser exclude
 // browser exclude








 // browser exclude




const index_VERSION = package_namespaceObject.i8

const index_debug = src_browser('webtorrent')

/**
 * Version number in Azureus-style. Generated from major and minor semver version.
 * For example:
 *   '0.16.1' -> '0016'
 *   '1.2.5' -> '0102'
 */
const VERSION_STR = index_VERSION
  .replace(/\d*./g, v => `0${v % 100}`.slice(-2))
  .slice(0, 4)

/**
 * Version prefix string (used in peer ID). WebTorrent uses the Azureus-style
 * encoding: '-', two characters for client id ('WW'), four ascii digits for version
 * number, '-', followed by random numbers.
 * For example:
 *   '-WW0102-'...
 */
const VERSION_PREFIX = `-WW${VERSION_STR}-`

/**
 * WebTorrent Client
 * @param {Object=} opts
 */
class WebTorrent extends events {
  constructor (opts = {}) {
    super()

    if (typeof opts.peerId === 'string') {
      this.peerId = opts.peerId
    } else if (ArrayBuffer.isView(opts.peerId)) {
      this.peerId = (0,browser/* arr2hex */.oc)(opts.peerId)
    } else {
      this.peerId = (0,browser/* arr2hex */.oc)((0,browser/* text2arr */.gR)(VERSION_PREFIX + (0,browser/* arr2base */.te)(randombytes_browser(9))))
    }
    this.peerIdBuffer = (0,browser/* hex2arr */._0)(this.peerId)

    if (typeof opts.nodeId === 'string') {
      this.nodeId = opts.nodeId
    } else if (ArrayBuffer.isView(opts.nodeId)) {
      this.nodeId = (0,browser/* arr2hex */.oc)(opts.nodeId)
    } else {
      this.nodeId = (0,browser/* arr2hex */.oc)(randombytes_browser(20))
    }
    this.nodeIdBuffer = (0,browser/* hex2arr */._0)(this.nodeId)

    this._debugId = (0,browser/* arr2hex */.oc)(this.peerId).substring(0, 7)

    this.destroyed = false
    this.listening = false
    this.torrentPort = opts.torrentPort || 0
    this.dhtPort = opts.dhtPort || 0
    this.tracker = opts.tracker !== undefined ? opts.tracker : {}
    this.lsd = opts.lsd !== false
    this.utPex = opts.utPex !== false
    this.torrents = []
    this.maxConns = Number(opts.maxConns) || 55
    this.utp = WebTorrent.UTP_SUPPORT && opts.utp !== false

    this._downloadLimit = Math.max((typeof opts.downloadLimit === 'number') ? opts.downloadLimit : -1, -1)
    this._uploadLimit = Math.max((typeof opts.uploadLimit === 'number') ? opts.uploadLimit : -1, -1)

    if (opts.secure === true) {
      Promise.resolve(/* import() */).then(__webpack_require__.bind(__webpack_require__, 3287)).then(({ enableSecure }) => enableSecure())
    }

    this._debug(
      'new webtorrent (peerId %s, nodeId %s, port %s)',
      this.peerId, this.nodeId, this.torrentPort
    )

    this.throttleGroups = {
      down: new speed_limiter.ThrottleGroup({ rate: Math.max(this._downloadLimit, 0), enabled: this._downloadLimit >= 0 }),
      up: new speed_limiter.ThrottleGroup({ rate: Math.max(this._uploadLimit, 0), enabled: this._uploadLimit >= 0 })
    }

    if (this.tracker) {
      if (typeof this.tracker !== 'object') this.tracker = {}
      if (globalThis.WRTC && !this.tracker.wrtc) this.tracker.wrtc = globalThis.WRTC
    }

    if (typeof conn_pool_ignored_ === 'function') {
      this._connPool = new conn_pool_ignored_(this)
    } else {
      queue_microtask(() => {
        this._onListening()
      })
    }

    // stats
    this._downloadSpeed = throughput()
    this._uploadSpeed = throughput()

    if (opts.dht !== false && typeof bittorrent_dht_ignored_.Client === 'function' /* browser exclude */) {
      // use a single DHT instance for all torrents, so the routing table can be reused
      this.dht = new bittorrent_dht_ignored_.Client(Object.assign({}, { nodeId: this.nodeId }, opts.dht))

      this.dht.once('error', err => {
        this._destroy(err)
      })

      this.dht.once('listening', () => {
        const address = this.dht.address()
        if (address) this.dhtPort = address.port
      })

      // Ignore warning when there are > 10 torrents in the client
      this.dht.setMaxListeners(0)

      this.dht.listen(this.dhtPort)
    } else {
      this.dht = false
    }

    // Enable or disable BEP19 (Web Seeds). Enabled by default:
    this.enableWebSeeds = opts.webSeeds !== false

    const ready = () => {
      if (this.destroyed) return
      this.ready = true
      this.emit('ready')
    }

    if (typeof load_ip_set_ignored_ === 'function' && opts.blocklist != null) {
      load_ip_set_ignored_(opts.blocklist, {
        headers: {
          'user-agent': `WebTorrent/${index_VERSION} (https://webtorrent.io)`
        }
      }, (err, ipSet) => {
        if (err) return console.error(`Failed to load blocklist: ${err.message}`)
        this.blocked = ipSet
        ready()
      })
    } else {
      queue_microtask(ready)
    }
  }

  /**
   * Creates an http server to serve the contents of this torrent,
   * dynamically fetching the needed torrent pieces to satisfy http requests.
   * Range requests are supported.
   *
   * @param {Object} options
   * @param {String} force
   * @return {BrowserServer||NodeServer}
   */
  createServer (options, force) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (this._server) throw new Error('server already created')
    if ((typeof window === 'undefined' || force === 'node') && force !== 'browser') {
      // node implementation
      this._server = new NodeServer(this, options)
      return this._server
    } else {
      // browser implementation
      if (!(options?.controller instanceof ServiceWorkerRegistration)) throw new Error('Invalid worker registration')
      if (options.controller.active.state !== 'activated') throw new Error('Worker isn\'t activated')
      this._server = new BrowserServer(this, options)
      return this._server
    }
  }

  get downloadSpeed () { return this._downloadSpeed() }

  get uploadSpeed () { return this._uploadSpeed() }

  get progress () {
    const torrents = this.torrents.filter(torrent => torrent.progress !== 1)
    const downloaded = torrents.reduce((total, torrent) => total + torrent.downloaded, 0)
    const length = torrents.reduce((total, torrent) => total + (torrent.length || 0), 0) || 1
    return downloaded / length
  }

  get ratio () {
    const uploaded = this.torrents.reduce((total, torrent) => total + torrent.uploaded, 0)
    const received = this.torrents.reduce((total, torrent) => total + torrent.received, 0) || 1
    return uploaded / received
  }

  /**
   * Returns the torrent with the given `torrentId`. Convenience method. Easier than
   * searching through the `client.torrents` array. Returns `null` if no matching torrent
   * found.
   *
   * @param  {string|Buffer|Object|Torrent} torrentId
   * @return {Promise<Torrent|null>}
   */
  async get (torrentId) {
    if (torrentId instanceof Torrent) {
      if (this.torrents.includes(torrentId)) return torrentId
    } else {
      const torrents = this.torrents
      let parsed
      try { parsed = await parse_torrent(torrentId) } catch (err) {}
      if (!parsed) return null
      if (!parsed.infoHash) throw new Error('Invalid torrent identifier')

      for (const torrent of torrents) {
        if (torrent.infoHash === parsed.infoHash) return torrent
      }
    }
    return null
  }

  /**
   * Start downloading a new torrent. Aliased as `client.download`.
   * @param {string|Buffer|Object} torrentId
   * @param {Object} opts torrent-specific options
   * @param {function=} ontorrent called when the torrent is ready (has metadata)
   */
  add (torrentId, opts = {}, ontorrent = () => {}) {
    if (this.destroyed) throw new Error('client is destroyed')
    if (typeof opts === 'function') [opts, ontorrent] = [{}, opts]

    const onInfoHash = () => {
      if (this.destroyed) return
      for (const t of this.torrents) {
        if (t.infoHash === torrent.infoHash && t !== torrent) {
          torrent._destroy(new Error(`Cannot add duplicate torrent ${torrent.infoHash}`))
          ontorrent(t)
          return
        }
      }
    }

    const onReady = () => {
      if (this.destroyed) return
      ontorrent(torrent)
      this.emit('torrent', torrent)
    }

    function onClose () {
      torrent.removeListener('_infoHash', onInfoHash)
      torrent.removeListener('ready', onReady)
      torrent.removeListener('close', onClose)
    }

    this._debug('add')
    opts = opts ? Object.assign({}, opts) : {}

    const torrent = new Torrent(torrentId, this, opts)
    this.torrents.push(torrent)

    torrent.once('_infoHash', onInfoHash)
    torrent.once('ready', onReady)
    torrent.once('close', onClose)

    return torrent
  }

  /**
   * Start seeding a new file/folder.
   * @param  {string|File|FileList|Buffer|Array.<string|File|Buffer>} input
   * @param  {Object=} opts
   * @param  {function=} onseed called when torrent is seeding
   */
  seed (input, opts, onseed) {
    if (this.destroyed) throw new Error('client is destroyed')
    if (typeof opts === 'function') [opts, onseed] = [{}, opts]

    this._debug('seed')
    opts = opts ? Object.assign({}, opts) : {}

    // no need to verify the hashes we create
    opts.skipVerify = true

    const isFilePath = typeof input === 'string'

    // When seeding from fs path, initialize store from that path to avoid a copy
    if (isFilePath) opts.path = path_browserify.dirname(input)
    if (!opts.createdBy) opts.createdBy = `WebTorrent/${VERSION_STR}`

    const onTorrent = torrent => {
      const tasks = [
        cb => {
          // when a filesystem path is specified or the store is preloaded, files are already in the FS store
          if (isFilePath || opts.preloadedStore) return cb()
          torrent.load(streams, cb)
        }
      ]
      if (this.dht) {
        tasks.push(cb => {
          torrent.once('dhtAnnounce', cb)
        })
      }
      run_parallel(tasks, err => {
        if (this.destroyed) return
        if (err) return torrent._destroy(err)
        _onseed(torrent)
      })
    }

    const _onseed = torrent => {
      this._debug('on seed')
      if (typeof onseed === 'function') onseed(torrent)
      torrent.emit('seed')
      this.emit('seed', torrent)
    }

    const torrent = this.add(null, opts, onTorrent)
    let streams

    if (index_isFileList(input)) input = Array.from(input)
    else if (!Array.isArray(input)) input = [input]

    run_parallel(input.map(item => cb => {
      if (!opts.preloadedStore && index_isReadable(item)) {
        simple_concat(item, (err, buf) => {
          if (err) return cb(err)
          buf.name = item.name
          cb(null, buf)
        })
      } else {
        cb(null, item)
      }
    }), (err, input) => {
      if (this.destroyed) return
      if (err) return torrent._destroy(err)

      parseInput(input, opts, (err, files) => {
        if (this.destroyed) return
        if (err) return torrent._destroy(err)

        streams = files.map(file => file.getStream)

        create_torrent(input, opts, async (err, torrentBuf) => {
          if (this.destroyed) return
          if (err) return torrent._destroy(err)

          const existingTorrent = await this.get(torrentBuf)
          if (existingTorrent) {
            console.warn('A torrent with the same id is already being seeded')
            torrent._destroy()
            if (typeof onseed === 'function') onseed(existingTorrent)
          } else {
            torrent._onTorrentId(torrentBuf)
          }
        })
      })
    })

    return torrent
  }

  /**
   * Remove a torrent from the client.
   * @param  {string|Buffer|Torrent}   torrentId
   * @param  {function} cb
   */
  async remove (torrentId, opts, cb) {
    if (typeof opts === 'function') return this.remove(torrentId, null, opts)

    this._debug('remove')
    const torrent = await this.get(torrentId)
    if (!torrent) throw new Error(`No torrent with id ${torrentId}`)
    this._remove(torrent, opts, cb)
  }

  _remove (torrent, opts, cb) {
    if (!torrent) return
    if (typeof opts === 'function') return this._remove(torrent, null, opts)
    this.torrents.splice(this.torrents.indexOf(torrent), 1)
    torrent.destroy(opts, cb)
    if (this.dht) {
      this.dht._tables.remove(torrent.infoHash)
    }
  }

  address () {
    if (!this.listening) return null
    return this._connPool
      ? this._connPool.tcpServer.address()
      : { address: '0.0.0.0', family: 'IPv4', port: 0 }
  }

  /**
   * Set global download throttle rate.
   * @param  {Number} rate (must be bigger or equal than zero, or -1 to disable throttling)
   */
  throttleDownload (rate) {
    rate = Number(rate)
    if (isNaN(rate) || !isFinite(rate) || rate < -1) return false
    this._downloadLimit = rate
    if (this._downloadLimit < 0) return this.throttleGroups.down.setEnabled(false)
    this.throttleGroups.down.setEnabled(true)
    this.throttleGroups.down.setRate(this._downloadLimit)
  }

  /**
   * Set global upload throttle rate
   * @param  {Number} rate (must be bigger or equal than zero, or -1 to disable throttling)
   */
  throttleUpload (rate) {
    rate = Number(rate)
    if (isNaN(rate) || !isFinite(rate) || rate < -1) return false
    this._uploadLimit = rate
    if (this._uploadLimit < 0) return this.throttleGroups.up.setEnabled(false)
    this.throttleGroups.up.setEnabled(true)
    this.throttleGroups.up.setRate(this._uploadLimit)
  }

  /**
   * Destroy the client, including all torrents and connections to peers.
   * @param  {function} cb
   */
  destroy (cb) {
    if (this.destroyed) throw new Error('client already destroyed')
    this._destroy(null, cb)
  }

  _destroy (err, cb) {
    this._debug('client destroy')
    this.destroyed = true

    const tasks = this.torrents.map(torrent => cb => {
      torrent.destroy(cb)
    })

    if (this._connPool) {
      tasks.push(cb => {
        this._connPool.destroy(cb)
      })
    }

    if (this.dht) {
      tasks.push(cb => {
        this.dht.destroy(cb)
      })
    }

    if (this._server) {
      tasks.push(cb => {
        this._server.destroy(cb)
      })
    }

    run_parallel(tasks, cb)

    if (err) this.emit('error', err)

    this.torrents = []
    this._connPool = null
    this.dht = null

    this.throttleGroups.down.destroy()
    this.throttleGroups.up.destroy()
  }

  _onListening () {
    this._debug('listening')
    this.listening = true

    if (this._connPool) {
      // Sometimes server.address() returns `null` in Docker.
      const address = this._connPool.tcpServer.address()
      if (address) this.torrentPort = address.port
    }

    this.emit('listening')
  }

  _debug () {
    const args = [].slice.call(arguments)
    args[0] = `[${this._debugId}] ${args[0]}`
    index_debug(...args)
  }

  async _getByHash (infoHashHash) {
    for (const torrent of this.torrents) {
      if (!torrent.infoHashHash) {
        torrent.infoHashHash = await (0,browser/* hash */.vp)((0,browser/* hex2arr */._0)('72657132' /* 'req2' */ + torrent.infoHash), 'hex')
      }
      if (infoHashHash === torrent.infoHashHash) {
        return torrent
      }
    }

    return null
  }
}

WebTorrent.WEBRTC_SUPPORT = simple_peer.WEBRTC_SUPPORT
WebTorrent.UTP_SUPPORT = conn_pool_ignored_.UTP_SUPPORT
WebTorrent.VERSION = index_VERSION

/**
 * Check if `obj` is a node Readable stream
 * @param  {*} obj
 * @return {boolean}
 */
function index_isReadable (obj) {
  return typeof obj === 'object' && obj != null && typeof obj.pipe === 'function'
}

/**
 * Check if `obj` is a W3C `FileList` object
 * @param  {*} obj
 * @return {boolean}
 */
function index_isFileList (obj) {
  return typeof FileList !== 'undefined' && obj instanceof FileList
}

})();

var __webpack_exports__default = __webpack_exports__.Z;
export { __webpack_exports__default as default };
