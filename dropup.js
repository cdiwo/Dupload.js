/**
 * HTML5 Based File Uploader Plugin. (Phototype JavaScript)
 * Version: 1.4.0
 * Description: HTML5 input selected or drop files to mutilpile upload.
 * Author: David Wei <weiguangchun@gmail.com>
 * Copyright: (c)2014-2016 CDIWO Inc. All Copyright Reserved. 
 * Github: https://github.com/cdiwo/Dropup
 * CreateDate: 2014-10-24 15:30
 * UpdateDate: 2016-04-08 22:00
 */

(function() {

    "use strict";
    /*=========================================
    ************   Drop Uploader   ************
    ==========================================*/
    var Dropup = function(container, params) {

        var du = this;
        du.version = "1.4.0";

        // 状态常量
        var QUEUED = "queued";
        var UPLOADING = "uploading";
        var CANCELED = "canceled";
        var ERROR = "error";
        var SUCCESS = "success";

        var defaults = {
            url: null, // ajax地址
            method: "POST", // 提交方式
            multipart_params: {},// 表单参数
            base64: false,
            withCredentials: false,
            allowExts: null, // 允许的文件类型, 格式: 扩展名[,扩展名], 如: jpeg,jpg,png,gif            
            maxFilesize: 256, // 单个文件限制 KB
            maxFiles: null, // 最大上传数
            parallelUploads: 2, // 并行上传量
            auto: true, // 自动上传
            multi: true, // 允许上传多个照片
            init: true, // 默认初始化
            debug: false,// 开启调试信息
            fileInput: null, // file控件
            fileDataName: 'file', // file数据名
            clickable: true, // 拖拽敏感区域是否可点击
            usedFastClick: false, // 是否使用了FastClick
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
            onProgress: function(du, file){}, // 上传进度
            onSuccess: function(du, file, response){}, // 上传成功
            onError: function(du, file, response){}, // 上传失败
            onCanceled: function(du, file){}, // 上传取消
            onDelete: function(du, file){}, // 文件删除
            onComplete: function(du){} // 全部上传完毕
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
            var arrFiles = [];
            for (var i = 0, file; file = files[i]; i++) {
                var exts = (this.params.allowExts || '').replace(/,/g, '|');
                var regExp = new RegExp("\\.(?:" + exts + ")$");

                if(!(this.params.allowExts === null || regExp.test(file.name))) {
                    file.status = ERROR;
                    file.errmsg = this.params.txtInvalidFileType;
                } else if(file.size >= this.params.maxFilesize * 1000) {
                    file.status = ERROR;
                    file.errmsg = this.params.txtFileTooBig.replace('{{maxFilesize}}',
                        Dropup.formatSize(this.params.maxFilesize * 1000));
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
            if (this.params.maxFiles
                    && (this.params.maxFiles < this.files.length + acceptFiles.length)) {
                alert(this.params.txtMaxFilesExceeded.replace('{{maxFiles}}', this.params.maxFiles));
                return false;
            }

            for (var i = 0, file; i < acceptFiles.length; i++) {
                file = acceptFiles[i];

                // 添加文件属性                
                file.id = Dropup.guid();
                file.src = Dropup.getSrc(file);
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

        // 单个文件上传完成，解析数据
        du.uploadComplete = function(file, responseText) {
            try {
                var json = eval("(" + responseText + ")");//JSON.parse(responseText);
                if (json.code === 0) {// 上传成功
                    file.url = json.data.url;
                    this.uploadSuccess(file, '上传成功');
                } else {//上传失败
                    this.uploadError(file, json.message);
                }
            } catch (_error) {
                if(this.params.debug) {
                    console.log('Response is not valid json.')
                }
                
                this.uploadSuccess(file, responseText);
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
            file.status = UPLOADING;

            var xhr = new XMLHttpRequest();
            file.xhr = xhr;

            xhr.open(du.params.method, du.params.url, true);
            xhr.withCredentials = !!du.params.withCredentials;

            if (xhr.upload) {
                // 上传中
                xhr.upload.addEventListener("progress", function(e) {
                    if(e.lengthComputable) {
                        file.percent = (e.loaded / e.total * 100).toFixed(2);
                        du.params.onProgress(du, file);
                    }
                }, false);

                // 上传成功
                xhr.addEventListener('load', function(e) {
                    du.uploadComplete(file, xhr.responseText);
                    if (du.getQueuedFiles().length === 0
                            && du.getUploadingFiles().length === 0) {
                        // 全部完毕
                        du.params.onComplete(du);
                    }
                }, false);

                // 上传失败
                xhr.addEventListener('error', function(e) {
                    du.uploadError(file, xhr.responseText);
                }, false);

                // 上传中止                 
                xhr.addEventListener('abort', function(e) {
                    du.params.onCanceled(du, file);
                }, false);

                // FormData属于XMLHttpRequest Level 2的，
                // 它可以很快捷的模拟Form表单数据并通过AJAX发送至后端，
                // FF5+，Chrome12+
                var formData = new FormData();

                // 迭代追加参数
                var params = du.params.multipart_params;
                for (var key in params) {
                    formData.append(key, params[key]);
                }

                formData.append(du.params.fileDataName, file);

                xhr.send(formData);
            }
        };

        // 初始化
        du.init = function() {

            if (typeof du.container === "string") {
                du.container = document.querySelector(du.container);
            }
            if (!(du.container && (du.container.nodeType !== null))) {
                throw new Error("Invalid dropup container.");
            }
            if(typeof du.fileInput === "string") {
                du.fileInput = document.querySelector(du.fileInput);
            }
            // 如果未设置，初始化一个图片选择控件                
            if (!(du.fileInput && (du.fileInput.nodeType !== null))) {
                var input = document.createElement('input');
                input.setAttribute('type', 'file');
                input.setAttribute('accept', 'image/*');
                input.setAttribute('capture', 'camera');
                input.setAttribute('stype', 'display:none;');

                du.fileInput = input;
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

            // 文件选择控件选择
            if (du.params.clickable && du.fileInput) {
                // 绑定容器click事件
                du.container.addEventListener("click", function(e) {
                    // 兼容FastClick单击无效果的问题
                    if(du.params.usedFastClick) {
                        setTimeout(function() {
                            du.fileInput.click();
                        }, 1000);// 必须为1000ms
                    } else {
                        du.fileInput.click();
                    }
                });

                // 绑定文件选择器change事件
                du.fileInput.addEventListener("change", function(e) {
                    du.addFiles(e);
                }, false);
            }

            // 检测是否支持HTML5上传
            if (!(window.File && window.FileList && window.FileReader && window.Blob)) {
                alert("您的浏览器不支持HTML5上传");
            }
        };

        // ////////* 外部事件 *//////////

        // 开始上传，一般事件绑定在“上传按钮”上
        du.start = function() {
            this.processQueue();
        };
        // 删除文件，根据文件ID
        // 取消上传 1、待上传；2、上传中; 3、已上传
        du.delete = function(id) {
            //查找文件
            var file, i = 0;
            while (i < this.files.length && (file = this.files[i]).id !== id)
                i++;

            // 取消正在上传的文件
            if (file.status === UPLOADING) {
                if (this.params.txtCancelUploadTips
                    && !window.confirm(this.params.txtCancelUploadTips)) {
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
        // 设置可选参数
        du.setOption = function(option, value) {
            function _setOption(option, value) {
                if(option == 'multipart_params') {
                    for(var key in value) {
                        du.params.multipart_params[key] = value[key];
                    }
                } else {
                    du.params[option] = value;
                }
            }
            if (typeof(option) === 'object') {
                for(var key in option) {
                    _setOption(key, option[key]);
                }
            } else {
                _setOption(option, value);
            }
        };

        /* 工具方法 */

        // 检测是否是移动端
        Dropup.isMobileDevice = function() {
            var ua = navigator.userAgent.toLowerCase();
            return ua.match(/iphone|ipad|ipod|android|symbianos|windows phone/) ? true : false;
        }
        // 格式化文件大小[保留两位小数]
        Dropup.formatSize = function(size) {
            return size >= 1000000 ? Math.round(size / 10000) / 100 + 'MB' : (size >= 1000 ? Math.round(size / 10) / 100 + 'KB' : size + 'B');
        };
        // 生成唯一ID
        Dropup.guid = function(len) {            
            var chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz1234567890_-';
            var maxPos = chars.length;
            var len = len || 32;
            var str = '', i;
            for (i = 0; i < len; i++) {
                str += chars.charAt(Math.floor(Math.random() * maxPos));
            }
            return str;
        }
        // 获取文件后缀名
        Dropup.getSuffix = function(filename) {
            pos = filename.lastIndexOf('.')
            suffix = ''
            if (pos != -1) {
                suffix = filename.substring(pos)
            }
            return suffix;
        }

        //获取文件Src
        Dropup.getSrc = function(file) {
            if (file.type.indexOf("image") === 0
                || (!file.type && /\.(?:jpg|jpeg|png|gif)$/.test(file.name))) {
                return Dropup.getImageSrc(file)
            }
            return "";
        };
        // 读取图片src
        Dropup.getImageSrc = function(file) {
            var src = null;
            // 多浏览器兼容性
            if(Dropup.isMobileDevice()) {
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
        };

        // 默认初始化
        if (du.params.init) this.init();

        // 返回实例
        return du;
    };

    // exports [AMD/RequireJS/Global]
    if (typeof define === 'function' && define.amd) {
        define(function() {
            return Dropup;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = Dropup;
    } else {
        (typeof window !== 'undefined' ? window : this).Dropup = Dropup;
    }
})();
