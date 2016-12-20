/**
 * HTML5 Based File Uploader Plugin. (Phototype JavaScript)
 * Version: 2.0.0
 * Description: HTML5 input selected or drop files to multiple upload.
 * Author: David Wei <weiguangchun@gmail.com>
 * Copyright: (c)2014-2016 CDIWO Inc. All Copyright Reserved. 
 * Github: https://github.com/cdiwo/Dupload.js
 * CreateDate: 2014-10-24 15:30
 * UpdateDate: 2016-12-20 23:00
 */

(function() {

    "use strict";
    /*=========================================
    **************   Duploader   **************
    ==========================================*/
    var Dupload = function(container, params) {

        var du = this;
        du.version = "2.0.0";

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
            maxFilesize: 256, // 单个文件限制，单位: KB
            maxFiles: null, // 最大上传数
            parallelUploads: 2, // 并行上传量
            auto: true, // 自动上传
            multi: true, // 允许上传多个照片
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
        du.onDragHover = function(e) {
            e.stopPropagation();
            e.preventDefault();
            e.type === "dragover" ? this.params.onDragOver() : this.params.onDragLeave();
        };

        // 根据文件状态获取
        du.getFilesWithStatus = function(status) {
            var _ref = this.files, _results = [];
            for (var i = 0, file; i < _ref.length; i++) {
                file = _ref[i];
                if (file.status === status) {
                    _results.push(file);
                }
            }
            return _results;
        };

        // 获取已经入队的文件
        du.getQueuedFiles = function() {
            return this.getFilesWithStatus(QUEUED);
        };

        // 获取正在上传的文件
        du.getUploadingFiles = function() {
            return this.getFilesWithStatus(UPLOADING);
        };

        // 获取上传成功的文件
        du.getSuccessFiles = function() {
            return this.getFilesWithStatus(SUCCESS);
        };

        // 过滤器
        du.filter = function(files) {
            var i = 0, arrFiles = [], file;
            while ((file = files[i++])) {
                var exts = (this.params.allowExts || '').replace(/,/g, '|').replace(/\s/g, '');
                var regExp = new RegExp("\\.(?:" + exts + ")$");

                if(!(this.params.allowExts === null || regExp.test(file.name.toLowerCase()))) {
                    file.status = ERROR;
                    file.errmsg = this.params.txtInvalidFileType;
                } else if(file.size >= this.params.maxFilesize * 1000) {
                    file.status = ERROR;
                    file.errmsg = this.params.txtFileTooBig.replace('{{maxFilesize}}',
                        Util.formatSize(this.params.maxFilesize * 1000));
                }
                arrFiles.push(file);
            }
            return arrFiles;
        };

        // 获取选择文件，file控件或拖放
        du.addFiles = function(e) {
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
            if (this.params.maxFiles && 
                (this.params.maxFiles < this.files.length + acceptFiles.length)) {
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
        du.enqueueFile = function(file) {
            file.status = QUEUED;
            
            if (this.params.auto) {
                return setTimeout(((function(_this) {
                    return function() {
                        return _this.processQueue();
                    };
                })(this)), 0);
            }
        };

        // 处理队列 => 1、判断是否达到最大处理数，2、非自动上传，默认最大同时处理10个文件
        du.processQueue = function() {
            var parallelUploads = this.params.auto ? this.params.parallelUploads : 10;
            var processingLength = this.getUploadingFiles().length;
            // 超过最大处理数
            if (processingLength >= parallelUploads) {
                return;
            }
            // 队列文件为空
            var queuedFiles = this.getQueuedFiles();
            if (!(queuedFiles.length > 0)) {
                return;
            }
            // 处理文件，队列文件不为空的情况下，上传最大数量为parallelUploads
            var i = processingLength;
            while (i < parallelUploads && queuedFiles.length) {
                this.uploadFile(queuedFiles.shift());
                i++;
            }
        };

        // 单个文件上传完成，触发外部onUploaded事件
        du.uploadComplete = function(file, responseText) {
            file.status = UPLOADED;

            var ret;
            if((ret = this.params.onUploaded(du, file, responseText))) {
                if(ret === true) {
                    this.params.onSuccess(du, file, "上传成功");
                } else {
                    this.params.onError(du, file, ret);
                }
            }

            if (this.params.auto) {
                this.processQueue();
            }
        };

        // 单个文件上传成功，触发外部onSuccess事件
        du.uploadSuccess = function(file, message) {
            file.status = SUCCESS;
            this.params.onSuccess(du, file, message);

            if (this.params.auto) {
                this.processQueue();
            }
        };
        // 单个文件上传失败，触发外部onError事件
        du.uploadError = function(file, message) {
            file.status = ERROR;
            this.params.onError(du, file, message);

            if (this.params.auto) {
                this.processQueue();
            }
        };

        // 单文件上传
        du.uploadFile = function(file) {
            // 上传前回调，在函数中可调用 setOption() 修改参数
            var ret;
            if((ret = this.params.onBefore(du, file))) {
                if(typeof ret === "string") {
                    return this.params.onError(du, file, ret);
                }
            }

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
            formData.append(du.params.fileVal, file);

            // 注册相关事件回调处理函数
            xhr.upload.onprogress = function(e) {
                if(e.lengthComputable) {
                    file.speed = (e.loaded / (new Date().getTime() - file.startTime)).toFixed(2) + "KB\/s";
                    file.percent = (e.loaded / e.total * 100).toFixed(2);
                    du.params.onProgress(du, file);
                }
            };
            xhr.onload = function(e) {// 这里readyState = 4
                var response = this.responseText;
                if(du.params.dataType === "json") {
                    response = JSON.parse(response);
                }
                
                du.uploadComplete(file, response);

                if (du.getQueuedFiles().length === 0 && 
                    du.getUploadingFiles().length === 0) {
                    // 全部完毕
                    du.params.onComplete(du);
                }
            };
            xhr.onerror = function(e) {
                du.params.onError(du, file, this.statusText);
            };
            xhr.onabort = function(e) {
                du.params.onCancel(du, file);
            };

            // 发送 HTTP 请求
            xhr.send(formData);
        };

        // 初始化
        du.init = function() {

            if (typeof du.container === "string") {
                du.container = document.querySelector(du.container);
            }
            if (!(du.container && (du.container.nodeType !== null))) {
                throw new Error("Uploader container invalid!");
            }
            if(typeof du.fileInput === "string") {
                du.fileInput = document.querySelector(du.fileInput);
            }
            // 如果未设置，自动生成文件选择器
            if (!(du.fileInput && (du.fileInput.nodeType !== null))) {
                du.fileInput = (function() {
                    var input = document.createElement('input');
                    // 默认设置
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/jpeg,image/jpg,image/png,image/gif');
                    input.setAttribute('capture', 'camera');

                    // 可选设置
                    du.params.multi && input.setAttribute('multiple', 'multiple');
                    du.params.allowMimeTypes && input.setAttribute('accept', du.params.allowMimeTypes);

                    return input;
                })();
            }

            // 绑定容器的dragover、dragover、drop事件
            du.container.addEventListener("dragover", function(e) {
                du.onDragHover(e);
            }, false);
            du.container.addEventListener("dragleave", function(e) {
                du.onDragHover(e);
            }, false);
            du.container.addEventListener("drop", function(e) {
                du.addFiles(e);
            }, false);

            // 绑定文件选择器change事件
            // 阻止file控件click事件冒泡，避免再次触发container的click事件，形成事件死循环
            du.fileInput.addEventListener("change", function(e) {
                du.addFiles(e);
            }, false);            
            du.fileInput.addEventListener("click", function(e) {
                e.stopPropagation();
            }, false);

            // 容器点击可触发上传，则绑定容器click事件
            if (du.params.clickable) {                
                du.container.addEventListener("click", function(e) {
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
        du.select = function() {
            du.fileInput.click();
        };
        // 开始上传，一般绑定在“开始上传按钮”上
        du.start = function() {
            this.processQueue();
        };
        // 删除文件，根据文件ID
        // 取消上传 1、待上传；2、上传中; 3、已上传
        du.delete = function(id) {
            //查找文件
            var file, i = 0;
            while (i < this.files.length && (file = this.files[i]).id !== id) i++;
            if(!file || file.id !== id) return false;

            // 取消正在上传的文件
            if (file.status === UPLOADING) {
                if (this.params.txtCancelUploadTips && 
                    !window.confirm(this.params.txtCancelUploadTips)) {
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
        du.setOption = function(option, value) {
            function _setOption(option, value) {
                if(typeof value === 'object') {
                    for(var key in value) {
                        du.params[option][key] = value[key];
                    }
                } else {
                    du.params[option] = value;
                }
            }
            if (typeof option === 'object') {
                for(var key in option) {
                    _setOption(key, option[key]);
                }
            } else {
                _setOption(option, value);
            }
        };
        du.getOption = function(key) {
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
    Util = {
        // 检测是否是移动端
        isMobileDevice: function() {
            var ua = navigator.userAgent.toLowerCase();
            return ua.match(/iphone|ipad|ipod|android|symbianos|windows phone/) ? true : false;
        },
        // 格式化文件大小, 返回带单位的字符串[保留两位小数]
        formatSize: function(size) {
            var unit, units = ['B', 'KB', 'MB'];
            while ((unit = units.shift()) && size > 1024) {
                size = size / 1024;
            }
            return (unit === 'B' ? size : size.toFixed(2)) + unit;
        },
        // 生成唯一ID => 前缀 + 当前时间 + 随机数 = 长度
        guid: function(len, prefix) {
            var chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz1234567890_-';
            var maxPos = chars.length;
            var guid = (prefix || 'du_') + (+new Date()).toString(32).toUpperCase(), i = guid.length;
            while (i++ < (len || 32)) {
                guid += chars.charAt(Math.floor(Math.random() * maxPos));
            }
            return guid;
        },
        // 获取文件后缀名
        getSuffix: function(filename) {
            return /\.([^.]+)$/.exec(filename) ? RegExp.$1.toLowerCase() : '';
        },
        //获取文件Src
        getSrc: function(file) {
            if (file.type.indexOf("image") === 0 || 
                (!file.type && /\.(?:jpg|jpeg|png|gif|bmp)$/.test(file.name.toLowerCase()))) {
                return Util.getImageSrc(file);
            }
            return "";
        },
        // 读取图片src
        getImageSrc: function(file) {
            var src = null;
            // 多浏览器兼容性
            if(this.isMobileDevice()) {
                src = "";
            } else if (window.URL.createObjectURL) {// safari
                // FF4+
                src = window.URL.createObjectURL(file);

                // window.URL.createObjectURL是有生命周期的，也就意味着你每用此方法获取URL，
                // 其生命周期都会和DOM一样，它会单独占用内存，所以当删除图片或不再需要它是，
                // 记得用window.URL.revokeObjectURL(file)来释放其内存。当然，如果你没有释放，刷新页面也是可以释放的。
                window.URL.revokeObjectURL(file);
            } else if (window.webkitURL.createObjectURL) {// mozilla
                // Chrome8+
                src = window.webkitURL.createObjectURL(file);
            } else {
                // 实例化file reader对象
                var reader = new FileReader();
                reader.onload = function(e) {
                    src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
            return src;
        }
    };

    // 静态方法
    Dupload.create = function(container, config) {
        if (typeof(container) === 'object') {
            config = container;
            container = config.container;
        }
        return new Dupload(container, config);
    };

    // exports [AMD/RequireJS/Global]
    if (typeof define === 'function' && define.amd) {
        define(function() {
            return Dupload;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = Dupload;
    } else {
        (typeof window !== 'undefined' ? window : this).Dupload = Dupload;
    }
})();
