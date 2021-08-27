export class ByteStringBuffer {
  constructor(b) {
    this.util = {
      isArrayBuffer: x => typeof ArrayBuffer !== 'undefined' && x instanceof ArrayBuffer,
      isArrayBufferView: x => x && util.isArrayBuffer(x.buffer) && x.byteLength !== undefined,
      decodeUtf8: str => decodeURIComponent(escape(str))
    }
    this.data = ''
    this.read = ''
    if(typeof b === 'string'){
      this.b = b
    }else if(this.util.isArrayBuffer(b) || this.util.isArrayBufferView(b)){
      const arr = new Uint8Array(b)
      try {
        this.data = String.fromCharCode.apply(null, arr)
      } catch(e) {
        for(let i = 0; i < arr.length; ++i) {
          this.putByte(arr[i])
        }
      }
    }else if(b instanceof ByteStringBuffer || (typeof b === 'object' && typeof b.data === 'string' && typeof b.read === 'number')    ) {
      // copy existing buffer
      this.data = b.data
      this.read = b.read
    }
    this._constructedStringLength = 0

  }
  putByte(b) {
    return this.putBytes(String.fromCharCode(b))
  }

  putBytes = function(bytes) {
    this.data += bytes
    this._optimizeConstructedString(bytes.length)
    return this
  }

  _optimizeConstructedString = function(x) {
    const _MAX_CONSTRUCTED_STRING_LENGTH = 4096
    this._constructedStringLength += x
    if(this._constructedStringLength > _MAX_CONSTRUCTED_STRING_LENGTH) {
      // this substr() should cause the constructed string to join
      this.data.substr(0, 1)
      this._constructedStringLength = 0
    }
  }

  length() {
    return this.data.length - this.read
  }

  isEmpty() {
    return this.length() <= 0
  }

  fillWithByte(b, n) {
    b = String.fromCharCode(b);
    let d = this.data;
    while(n > 0) {
      if(n & 1) {
        d += b;
      }
      n >>>= 1;
      if(n > 0) {
        b += b;
      }
    }
    this.data = d;
    this._optimizeConstructedString(n);
    return this;
  }

  putString(str) {
    return this.putBytes(this.encodeUtf8(str));
  }

  encodeUtf8(str) {
    return unescape(encodeURIComponent(str));
  }

  putInt16(i) {
    return this.putBytes(
      String.fromCharCode(i >> 8 & 0xFF) +
      String.fromCharCode(i & 0xFF));
  }


  putInt24(i) {
    return this.putBytes(
      String.fromCharCode(i >> 16 & 0xFF) +
      String.fromCharCode(i >> 8 & 0xFF) +
      String.fromCharCode(i & 0xFF));
  }

  putInt32(i) {
    return this.putBytes(
      String.fromCharCode(i >> 24 & 0xFF) +
      String.fromCharCode(i >> 16 & 0xFF) +
      String.fromCharCode(i >> 8 & 0xFF) +
      String.fromCharCode(i & 0xFF));
  }

  putInt16Le(i) {
    return this.putBytes(
      String.fromCharCode(i & 0xFF) +
      String.fromCharCode(i >> 8 & 0xFF));
  }

  putInt24Le(i) {
    return this.putBytes(
      String.fromCharCode(i & 0xFF) +
      String.fromCharCode(i >> 8 & 0xFF) +
      String.fromCharCode(i >> 16 & 0xFF));
  }

  putInt32Le(i) {
    return this.putBytes(
      String.fromCharCode(i & 0xFF) +
      String.fromCharCode(i >> 8 & 0xFF) +
      String.fromCharCode(i >> 16 & 0xFF) +
      String.fromCharCode(i >> 24 & 0xFF));
  }

  putInt(i, n) {
    let bytes = '';
    do {
      n -= 8;
      bytes += String.fromCharCode((i >> n) & 0xFF);
    } while(n > 0);
    return this.putBytes(bytes);
  }

  putSignedInt(i, n) {
    if(i < 0) {
      i += 2 << (n - 1);
    }
    return this.putInt(i, n)
  }

  putBuffer(buffer) {
    return this.putBytes(buffer.getBytes())
  }

  getByte() {
    return this.data.charCodeAt(this.read++)
  }

  getInt16() {
    const rval = (
      this.data.charCodeAt(this.read) << 8 ^
      this.data.charCodeAt(this.read + 1))
    this.read += 2
    return rval
  }

  getInt24() {
    const rval = (
      this.data.charCodeAt(this.read) << 16 ^
      this.data.charCodeAt(this.read + 1) << 8 ^
      this.data.charCodeAt(this.read + 2))
    this.read += 3
    return rval
  }
  getInt32() {
    const rval = (
      this.data.charCodeAt(this.read) << 24 ^
      this.data.charCodeAt(this.read + 1) << 16 ^
      this.data.charCodeAt(this.read + 2) << 8 ^
      this.data.charCodeAt(this.read + 3))
    this.read += 4
    return rval
  }
  getInt16Le() {
    const rval = (
      this.data.charCodeAt(this.read) ^
      this.data.charCodeAt(this.read + 1) << 8)
    this.read += 2
    return rval
  }
  getInt24Le() {
    const rval = (
      this.data.charCodeAt(this.read) ^
      this.data.charCodeAt(this.read + 1) << 8 ^
      this.data.charCodeAt(this.read + 2) << 16)
    this.read += 3
    return rval
  }
  getInt32Le() {
    const rval = (
      this.data.charCodeAt(this.read) ^
      this.data.charCodeAt(this.read + 1) << 8 ^
      this.data.charCodeAt(this.read + 2) << 16 ^
      this.data.charCodeAt(this.read + 3) << 24)
    this.read += 4
    return rval
  }
  getInt(n) {
    let rval = 0
    do {
      rval = (rval << 8) + this.data.charCodeAt(this.read++)
      n -= 8
    } while(n > 0)
    return rval
  }
  getSignedInt(n) {
    let x = this.getInt(n)
    let max = 2 << (n - 2)
    if(x >= max) {
      x -= max << 1
    }
    return x
  }
  getBytes(count) {
    let rval
    if(count) {
      // read count bytes
      count = Math.min(this.length(), count)
      rval = this.data.slice(this.read, this.read + count)
      this.read += count
    } else if(count === 0) {
      rval = ''
    } else {
      // read all bytes, optimize to only copy when needed
      rval = (this.read === 0) ? this.data : this.data.slice(this.read)
      this.clear()
    }
    return rval
  }
  bytes(count) {
    return (typeof(count) === 'undefined'
      ? this.data.slice(this.read)
      : this.data.slice(this.read, this.read + count));
  }
  at(i) {
    return this.data.charCodeAt(this.read + i);
  }
  setAt(i, b) {
    this.data = this.data.substr(0, this.read + i) +
      String.fromCharCode(b) +
      this.data.substr(this.read + i + 1)
    return this
  }
  last() {
    return this.data.charCodeAt(this.data.length - 1)
  }
  copy() {
    let c = util.createBuffer(this.data)
    c.read = this.read
    return c
  }
  compact() {
    if(this.read > 0) {
      this.data = this.data.slice(this.read)
      this.read = 0
    }
    return this
  }
  clear() {
    this.data = ''
    this.read = 0
    return this
  }
  truncate(count) {
    const len = Math.max(0, this.length() - count)
    this.data = this.data.substr(this.read, len)
    this.read = 0
    return this
  }
  toHex() {
    let rval = ''
    for(let i = this.read; i < this.data.length; ++i) {
      const b = this.data.charCodeAt(i)
      if(b < 16) {
        rval += '0'
      }
      rval += b.toString(16)
    }
    return rval
  }
  toString() {
    return this.util.decodeUtf8(this.bytes());
  };


}