/**
 * HTML5 Based File Uploader Plugin. (Phototype JavaScript)
 * Version: 2.1.0
 * Description: HTML5 input selected or drop files to multiple upload.
 * Author: David Wei <weiguangchun@gmail.com>
 * Copyright: (c)2014-2017 CDIWO Inc. All Copyright Reserved.
 * Github: https://github.com/cdiwo/Dupload.js
 * CreateDate: 2014-10-24 15:30
 * UpdateDate: 2017-03-20 16:00
 */

(function () {

    "use strict";
    /*=========================================
     **************   Duploader   **************
     ==========================================*/
    var Dupload = function (container, params) {

        var du = this;
        du.version = "2.1.0";

        // 状态常量
        var QUEUED = "queued";
        var UPLOADING = "uploading";
        var UPLOADED = "uploaded";
        var CANCELED = "canceled";
        var ERROR = "error";
        var SUCCESS = "success";

        var defaults = {
            url: null, // ajax地址
            method: "POST", // 提交方式
            withCredentials: false,// 跨域时提交cookie
            header: {},// 请求头部信息
            formData: {},// 参数表
            dataType: "json",// 返回数据类型: text, json
            fileVal: "file", // 文件上传域的name
            fileInput: null, // file控件css选择器
            allowExts: null,// 允许的文件类型, 格式: 扩展名[,扩展名], 如: jpeg,jpg,png,gif
            allowMimeTypes: null,// 可选择的Mime类型，对个用逗号隔开
            maxFilesize: 8192, // 单个文件限制，单位: KB
            maxFiles: null, // 最大上传数
            parallelUploads: 2, // 并行上传量
            auto: true, // 自动上传
            multi: true, // 允许上传多个照片
            compress: false, // 开启图片压缩, 默认为false
            init: true, // 默认初始化
            clickable: true, // 拖拽敏感区域是否可点击
            txtFileTooBig: "文件上传限制最大为{{maxFilesize}}.",
            txtInvalidFileType: "不允许的文件类型",
            txtMaxFilesExceeded: "最多能上传{{maxFiles}}个文件",
            txtCancelUploadTips: "您确定要取消上传吗？",
            /*
            Callbacks:
            */
            onDragOver: function(){}, // 拖拽到敏感区域
            onDragLeave: function(){}, // 离开敏感区域
            onDrop: function(du, file){}, // 文件选择后
            onBefore: function(du, file){},// 上传前
            onProgress: function(du, file){}, // 上传进度
            onUploaded: function(du, file, response){}, // 上传完毕
            onSuccess: function(du, file, response){}, // 上传成功
            onError: function(du, file, response){}, // 上传失败
            onCancel: function(du, file){}, // 上传取消
            onDelete: function(du, file){}, // 文件删除
            onComplete: function(du){}, // 全部上传完毕
        };

        // 可选参数
        for (var param in params) {
            defaults[param] = params[param];
        }

        du.params = defaults || {};
        du.files = []; // 过滤后的文件数组队列
        du.container = container; // 拖拽敏感区域
        du.fileInput = du.params.fileInput;// file 控件

        // 内部事件 文件拖放
        // (注意)dragover事件一定要清除默认事件
        // 不然会无法触发后面的drop事件
        du.onDragHover = function (e) {
            e.stopPropagation();
            e.preventDefault();
            e.type === "dragover" ? this.params.onDragOver() : this.params.onDragLeave();
        };

        // 根据文件状态获取
        du.getFilesWithStatus = function (status) {
            var arr = [], i = 0, file;
            if (typeof status === 'string') {
                status = status.split(',');
            }
            while ((file = this.files[i++])) {
                if (~status.indexOf(file.status)) {
                    arr.push(file);
                }
            }
            return arr;
        };

        // 获取已经入队的文件
        du.getQueuedFiles = function () {
            return this.getFilesWithStatus(QUEUED);
        };

        // 获取正在上传的文件
        du.getUploadingFiles = function () {
            return this.getFilesWithStatus(UPLOADING);
        };

        // 获取上传成功的文件
        du.getSuccessFiles = function () {
            return this.getFilesWithStatus(SUCCESS);
        };

        // 过滤器
        du.filter = function (files) {
            var opts = this.params, i = 0, arrFiles = [], file = {},
                tmp;
            while ((tmp = files[i++])) {
                file.source = tmp;
                file.name = tmp.name;
                file.type = tmp.type;
                file.size = tmp.size;

                var exts = (opts.allowExts || '').replace(/,/g, '|').replace(/\s/g, '');
                var regExp = new RegExp("\\.(?:" + exts + ")$");

                if (!(opts.allowExts === null || regExp.test(file.name.toLowerCase()))) {
                    file.status = ERROR;
                    file.errmsg = opts.txtInvalidFileType;
                } else if (opts.maxFilesize && file.size >= opts.maxFilesize * 1000) {
                    file.status = ERROR;
                    file.errmsg = opts.txtFileTooBig.replace('{{maxFilesize}}',
                        Util.formatSize(opts.maxFilesize * 1000));
                }

                arrFiles.push(file);
            }
            return arrFiles;
        };

        // 获取选择文件，file控件或拖放
        du.addFiles = function (e) {
            // 取消鼠标经过样式
            this.onDragHover(e);

            // 获取文件列表对象
            var files = e.target.files || e.dataTransfer.files;

            // 过滤文件
            var acceptFiles = this.filter(files);

            // 不允许多文件上传的时候只取其中一个文件
            if (!this.params.multi && acceptFiles.length > 1) {
                acceptFiles = [acceptFiles[0]];
            }

            // 必须小于最大上传量
            var countFile = this.getFilesWithStatus([QUEUED, UPLOADING, UPLOADED, SUCCESS]);
            if (this.params.maxFiles &&
                (this.params.maxFiles < countFile.length + acceptFiles.length)) {
                alert(this.params.txtMaxFilesExceeded.replace('{{maxFiles}}', this.params.maxFiles));
                return false;
            }

            for (var i = 0, file; i < acceptFiles.length; i++) {
                file = acceptFiles[i];

                // 添加文件属性
                file.id = Util.guid();
                file.src = Util.getSrc(file);
                file.percent = 0;

                this.files.push(file);

                if (file.status !== ERROR) {
                    this.enqueueFile(file);
                    this.params.onDrop(du, file);
                } else {
                    this.params.onError(du, file, file.errmsg);
                }
            }
        };

        // 文件入队 ＝> 1、改变状态；2、处理队列
        du.enqueueFile = function (file) {
            file.status = QUEUED;

            if (this.params.auto) {
                return setTimeout(((function (_this) {
                    return function () {
                        return _this.processQueue();
                    };
                })(this)), 0);
            }
        };

        // 处理队列 => 1、判断是否达到最大处理数，2、非自动上传，默认最大同时处理10个文件
        du.processQueue = function () {
            var parallelUploads = this.params.auto ? this.params.parallelUploads : 10;
            var processingLength = this.getUploadingFiles().length;
            // 超过最大处理数
            if (processingLength >= parallelUploads) {
                return;
            }
            // 队列文件为空
            var queuedFiles = this.getQueuedFiles();
            if (queuedFiles.length <= 0) {
                return;
            }
            // 处理文件，队列文件不为空的情况下，上传最大数量为parallelUploads
            var i = processingLength;
            while (i < parallelUploads && queuedFiles.length) {
                this.beforeUploadFile(queuedFiles.shift());
                i++;
            }
        };

        // 单个文件上传完成，触发外部onUploaded事件
        du.uploadComplete = function (file, responseText) {
            file.status = UPLOADED;

            var ret;
            if ((ret = this.params.onUploaded(du, file, responseText))) {
                if (ret === true) {
                    // 单个文件上传成功，触发onSuccess事件
                    file.status = SUCCESS;
                    this.params.onSuccess(du, file, "上传成功");
                } else {
                    // 单个文件上传失败，触发onError事件
                    file.status = ERROR;
                    this.params.onError(du, file, ret);
                }
            } // else {} 不做处理

            if (this.params.auto) {
                this.processQueue();
            }
        };

        // 文件上传前处理
        du.beforeUploadFile = function (file) {
            var opts = this.params,
                ret;

            // 上传前回调，在函数中可调用 setOption() 修改参数
            if ((ret = opts.onBefore(du, file))) {
                if (typeof ret === "string") {
                    return opts.onError(du, file, ret);
                }
            }

            // 只压缩 jpeg 图片格式。
            // gif 可能会丢失针
            // bmp png 基本上尺寸都不大，且压缩比比较小。
            if (opts.compress && ~'image/jpeg,image/jpg'.indexOf(file.type) && !file._compressed) {
                DImage.resize(file, opts.compress, function () {
                    du.uploadFile(file);
                });
            } else {
                du.uploadFile(file);
            }

        };

        // 单文件上传
        du.uploadFile = function (file) {

            // 创建 XMLHttpRequest 对象
            var xhr = new XMLHttpRequest();
            file.xhr = xhr;
            file.status = UPLOADING;
            file.startTime = new Date().getTime();

            // 初始化 HTTP 请求参数，但是并不发送请求
            xhr.open(du.params.method, du.params.url, true);
            // 跨域时，是否允许携带cookie
            xhr.withCredentials = !!du.params.withCredentials;
            // 设置请求头部信息
            for (var key in du.params.header) {
                xhr.setRequestHeader(key, du.params.header[key]);
            }
            // FormData 属于 XMLHttpRequest Level 2 的，
            // 它可以很快捷的模拟Form表单数据并通过AJAX发送至后端，
            // FF5+，Chrome12+
            var formData = new FormData();
            // 添加默认请求参数表
            for (var key in du.params.formData) {
                formData.append(key, du.params.formData[key]);
            }
            // 添加上传文件
            formData.append(du.params.fileVal, file.source, file.name || '');

            // 注册相关事件回调处理函数
            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    file.speed = (e.loaded / (new Date().getTime() - file.startTime)).toFixed(2) + "KB\/s";
                    file.percent = (e.loaded / e.total * 100).toFixed(2);
                    du.params.onProgress(du, file);
                }
            };
            xhr.onload = function (e) {// 这里readyState = 4
                var response = this.responseText;
                if (du.params.dataType === "json") {
                    response = JSON.parse(response);
                }

                du.uploadComplete(file, response);

                if (du.getQueuedFiles().length === 0 &&
                    du.getUploadingFiles().length === 0) {
                    // 全部完毕
                    du.params.onComplete(du);
                }
            };
            xhr.onerror = function (e) {
                du.params.onError(du, file, this.statusText ? this.statusText : 'server error');
            };
            xhr.onabort = function (e) {
                du.params.onCancel(du, file);
            };

            // 发送 HTTP 请求
            xhr.send(formData);
        };

        // 初始化
        du.init = function () {

            if (typeof du.container === "string") {
                du.container = document.querySelector(du.container);
            }
            if (!(du.container && (du.container.nodeType !== null))) {
                throw new Error("Uploader container invalid!");
            }
            if (typeof du.fileInput === "string") {
                du.fileInput = document.querySelector(du.fileInput);
            }
            // 如果未设置，自动生成文件选择器
            if (!(du.fileInput && (du.fileInput.nodeType !== null))) {
                du.fileInput = (function () {
                    var input = document.createElement('input');
                    // 默认设置
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/jpeg,image/jpg,image/png,image/gif');
                    input.setAttribute('capture', 'camera');

                    // 可选设置
                    if (du.params.multi) input.setAttribute('multiple', 'multiple');
                    if (du.params.allowMimeTypes) input.setAttribute('accept', du.params.allowMimeTypes);

                    return input;
                })();
            }

            // 绑定容器的dragover、dragover、drop事件
            du.container.addEventListener("dragover", function (e) {
                du.onDragHover(e);
            }, false);
            du.container.addEventListener("dragleave", function (e) {
                du.onDragHover(e);
            }, false);
            du.container.addEventListener("drop", function (e) {
                du.addFiles(e);
            }, false);

            // 绑定文件选择器change事件
            // 阻止file控件click事件冒泡，避免再次触发container的click事件，形成事件死循环
            du.fileInput.addEventListener("change", function (e) {
                du.addFiles(e);
            }, false);
            du.fileInput.addEventListener("click", function (e) {
                e.stopPropagation();
            }, false);

            // 容器点击可触发上传，则绑定容器click事件
            if (du.params.clickable) {
                du.container.addEventListener("click", function (e) {
                    du.fileInput.click();
                });
            }

            // 检测是否支持HTML5上传
            if (!(window.File && window.FileList && window.FileReader && window.Blob)) {
                alert("您的浏览器不支持HTML5上传");
            }
        };

        // ////////* 外部事件 *//////////

        // 选择文件，一般绑定在“添加文件按钮”上
        du.select = function () {
            du.fileInput.click();
        };
        // 开始上传，一般绑定在“开始上传按钮”上
        du.start = function () {
            this.processQueue();
        };
        // 删除文件，根据文件ID
        // 取消上传 1、待上传；2、上传中; 3、已上传
        du.delete = function (id) {
            //查找文件
            var i = 0, file;
            while ((file = this.files[i++]) && (file.id !== id)) continue;

            if (!file || file.id !== id) return false;

            // 取消正在上传的文件
            if (file.status === UPLOADING) {
                if (this.params.txtCancelUploadTips && !window.confirm(this.params.txtCancelUploadTips)) {
                    return false;
                }

                file.xhr.abort();
            }
            // 被移除的文件是取消状态
            file.status = CANCELED;

            // 激活本地移除事件
            this.params.onDelete(du, file);

            if (this.params.auto) {
                return this.processQueue();
            }
        };
        // 设置可选参数, 支持3种形式
        // setOption('name', 'value')
        // setOption('name', {key: value})
        // setOption({key: value, key2: {}})
        du.setOption = function (option, value) {
            function _setOption(option, value) {
                if (typeof value === 'object') {
                    for (var key in value) {
                        du.params[option][key] = value[key];
                    }
                } else {
                    du.params[option] = value;
                }
            }

            if (typeof option === 'object') {
                for (var key in option) {
                    _setOption(key, option[key]);
                }
            } else {
                _setOption(option, value);
            }
        };
        du.getOption = function (key) {
            return !key ? this.params : this.params[key];
        };

        // 默认初始化
        if (du.params.init) this.init();

        // 返回实例
        return du;
    },

    /**********
     * 工具类 *
     **********/
    UrlAPI = window.createObjectURL && window ||
        window.URL && URL.revokeObjectURL && URL ||
        window.webkitURL,
    Util = {
        createObjectURL: UrlAPI.createObjectURL,
        revokeObjectURL: UrlAPI.revokeObjectURL,
        // 格式化文件大小, 返回带单位的字符串[保留两位小数]
        formatSize: function (size) {
            var unit, units = ['B', 'KB', 'MB'];
            while ((unit = units.shift()) && size > 1024) {
                size = size / 1024;
            }
            return (unit === 'B' ? size : size.toFixed(2)) + unit;
        },
        // 生成唯一ID => 前缀 + 当前时间 + 随机数 = 长度
        guid: function (len, prefix) {
            var chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz1234567890_-';
            var maxPos = chars.length;
            var guid = (prefix || 'du_') + (+new Date()).toString(32).toUpperCase(), i = guid.length;
            while (i++ < (len || 32)) {
                guid += chars.charAt(Math.floor(Math.random() * maxPos));
            }
            return guid;
        },
        // 获取文件后缀名
        getSuffix: function (filename) {
            return /\.([^.]+)$/.exec(filename) ? RegExp.$1.toLowerCase() : '';
        },
        //获取文件Src
        getSrc: function (file) {
            if (file.type.indexOf("image") === 0 ||
                (!file.type && /\.(?:jpg|jpeg|png|gif|bmp)$/.test(file.name.toLowerCase()))) {
                return Util.createObjectURL(file.source);
            }
            return "";
        }
    },

    /**********
     * 图片类 *
     **********/
    DImage = function (file, opts, resolve) {
        var me = this;
        var BLANK = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D';

        var defaults = {
            // 最大宽高
            width: 1280,
            height: 1280,
            // 图片质量，只有type为`image/jpeg`的时候才有效。
            quality: 90,
            // 是否保留头部meta信息。
            preserveHeaders: true
        };

        for (var param in opts) {
            defaults[param] = opts[param];
        }

        me.opts = defaults;
        me.debug = false;

        me.init = function () {
            var img = new Image();

            img.onload = function () {
                // 读取meta信息。
                if (!me._metas && 'image/jpeg' === me.type) {
                    me.parse(file.source, function (error, ret) {
                        me._metas = ret;
                        me.resize(me.opts.width, me.opts.height);
                    });
                } else {
                    me.resize(me.opts.width, me.opts.height);
                }
            };

            img.onerror = function () {
                me.trigger('error');
            };

            img.src = file.src;
            me.type = file.type;

            me._img = img;
        };

        me.destroy = function () {
            var canvas = this._canvas;
            this._img.onload = null;

            if (canvas) {
                canvas.getContext('2d')
                    .clearRect(0, 0, canvas.width, canvas.height);
                canvas.width = canvas.height = 0;
                this._canvas = null;
            }

            // 释放内存。非常重要，否则释放不了image的内存。
            this._img.src = BLANK;
            this._img = null;
        };

        me.dataURL2Blob = function (base64) {
            var byteStr, intArray, ab, i, mimetype, parts;

            parts = base64.split(',');

            if (~parts[0].indexOf('base64')) {
                byteStr = atob(parts[1]);
            } else {
                byteStr = decodeURIComponent(parts[1]);
            }

            ab = new ArrayBuffer(byteStr.length);
            intArray = new Uint8Array(ab);

            for (i = 0; i < byteStr.length; i++) {
                intArray[i] = byteStr.charCodeAt(i);
            }

            mimetype = parts[0].split(':')[1].split(';')[0];

            return this.arrayBufferToBlob(ab, mimetype);
        };

        me.dataURL2ArrayBuffer = function (base64) {
            var byteStr, intArray, i, parts;

            parts = base64.split(',');

            if (~parts[0].indexOf('base64')) {
                byteStr = atob(parts[1]);
            } else {
                byteStr = decodeURIComponent(parts[1]);
            }

            intArray = new Uint8Array(byteStr.length);

            for (i = 0; i < byteStr.length; i++) {
                intArray[i] = byteStr.charCodeAt(i);
            }

            return intArray.buffer;
        };

        me.arrayBufferToBlob = function (buffer, type) {
            var builder = window.BlobBuilder || window.WebKitBlobBuilder,
                bb;

            // android不支持直接new Blob, 只能借助blobbuilder.
            if (builder) {
                bb = new builder();
                bb.append(buffer);
                return bb.getBlob(type);
            }

            return new Blob([buffer], type ? {type: type} : {});
        };

        me.getAsBlob = function () {
            var me = this,
                canvas = this._canvas,
                base64, buffer, blob;

            try {
                // android下面canvas.toDataUrl不支持jpeg，得到的结果是png.
                if (this.type === 'image/jpeg') {
                    base64 = canvas.toDataURL(this.type, me.opts.quality / 100);

                    if (me.opts.preserveHeaders && this._metas && this._metas.imageHead) {
                        buffer = me.dataURL2ArrayBuffer(base64);
                        buffer = me.updateImageHead(buffer, this._metas.imageHead);
                        blob = me.arrayBufferToBlob(buffer, this.type);
                        console.log(blob)
                        return blob;
                    }
                } else {
                    base64 = canvas.toDataURL(this.type);
                }
                blob = this.dataURL2Blob(base64);

            } catch (e) {
                // 出错了直接继续
            }
            return blob;
        };

        me.resize = function (width, height) {
            var canvas = this._canvas ||
                    (this._canvas = document.createElement('canvas')),
                blob;

            this._resize(this._img, canvas, width, height);

            blob = this.getAsBlob();

            file.size = blob.size;
            file.source = blob;

            // 完成后，后续程序继续
            resolve();
        };

        me._resize = function (img, cvs, width, height) {
            var naturalWidth = img.width,
                naturalHeight = img.height,
                scale, w, h;

            // 如果 width 的值介于 0 - 1
            // 说明设置的是百分比。
            if (width <= 1 && width > 0) {
                width = naturalWidth * width;
            }
            // 同样的规则应用于 height
            if (height <= 1 && height > 0) {
                height = naturalHeight * height;
            }

            scale = Math.min(width / naturalWidth, height / naturalHeight);

            // 不允许放大
            scale = Math.min(1, scale);

            w = naturalWidth * scale;
            h = naturalHeight * scale;

            cvs.width = w;
            cvs.height = h;

            var ctx = cvs.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
        };

        me.maxMetaDataSize = 262144;
        me.parse = function (blob, cb) {
            var me = this,
                fr = new FileReader();

            fr.onload = function () {
                cb(false, me._parse(this.result));
                fr = fr.onload = fr.onerror = null;
            };

            fr.onerror = function (e) {
                cb(e.message);
                fr = fr.onload = fr.onerror = null;
            };

            blob = blob.slice(0, me.maxMetaDataSize);
            fr.readAsArrayBuffer(blob);
        };

        me._parse = function (buffer) {
            if (buffer.byteLength < 6) {
                return;
            }

            var dataView = new DataView(buffer),
                offset = 2,
                maxOffset = dataView.byteLength - 4,
                ret = {},
                markerBytes, markerLength;

            if (me.debug) console.log("Got file of length " + buffer.byteLength);
            if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
                if (me.debug) console.log("Not a valid JPEG");
                return ret;
            }

            if (dataView.getUint16(0) === 0xffd8) {

                while (offset < maxOffset) {
                    markerBytes = dataView.getUint16(offset);
                    if (me.debug) console.log(markerBytes);

                    if (markerBytes >= 0xffe0 && markerBytes <= 0xffef ||
                        markerBytes === 0xfffe) {

                        markerLength = dataView.getUint16(offset + 2) + 2;

                        if (offset + markerLength > dataView.byteLength) {
                            break;
                        }

                        offset += markerLength;
                    } else {
                        break;
                    }
                }

                if (offset > 6) {
                    // Workaround for IE10, which does not yet
                    // support ArrayBuffer.slice:
                    ret.imageHead = new Uint8Array(buffer).subarray(2, offset);
                }
            }

            return ret;
        };

        me.updateImageHead = function (buffer, head) {
            var data = this._parse(buffer),
                bodyOffset = 2,
                buf1, buf2;

            // buffer可能含有head信息
            if (data.imageHead) {
                bodyOffset += data.imageHead.byteLength;
            }

            buf2 = new Uint8Array(buffer).subarray(bodyOffset);
            buf1 = new Uint8Array(head.byteLength + 2 + buf2.byteLength);
            buf1[0] = 0xFF;
            buf1[1] = 0xD8;
            buf1.set(new Uint8Array(head), 2);
            buf1.set(new Uint8Array(buf2), head.byteLength + 2);

            return buf1.buffer;
        };

        me.init();
    };

    DImage.resize = function (file, opts, callback) {
        return new DImage(file, opts, callback);
    };

    // 静态方法
    Dupload.create = function (container, config) {
        if (typeof container === 'object') {
            config = container;
            container = config.container;
        }
        return new Dupload(container, config);
    };

    // exports [AMD/RequireJS/Global]
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return Dupload;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = Dupload;
    } else {
        (typeof window !== 'undefined' ? window : this).Dupload = Dupload;
    }
})();
