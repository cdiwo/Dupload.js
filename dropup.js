/**
 * HTML5 Based File Uploader Plugin. (Phototype JavaScript)
 * Version: 1.3.1 
 * Description: HTML5 input selected or drop files to mutilpile upload.
 * Author: David Wei <weiguangchun@gmail.com>
 * Copyright: (c)2014-2015 CDIWO Inc. All Copyright Reserved. 
 * Website: https://github.com/cdiwo/Dropup
 * CreateDate: 2014-10-24 15:30
 * UpdateDate: 2015-09-24 23:30
 */

(function() {

    "use strict";
    /*=========================================
    ************   Drop Uploader   ************
    ==========================================*/
    var Dropup = function(container, params) {

        var du = this;
        du.version = "1.3.0";

        // 状态常量
        var QUEUED = "queued";
        var UPLOADING = "uploading";
        var CANCELED = "canceled";
        var ERROR = "error";
        var SUCCESS = "success";

        var defaults = {
            url: null, // ajax地址
            method: "POST", // 提交方式
            withCredentials: false,
            allowExts: null, // 待上传的文件类型
            fileExtDir: null, // 默认文件类型图片目录地址
            maxFiles: null, // 最大上传数
            maxFilesize: 256, // 单个文件最大 KB
            parallelUploads: 2, // 并行上传量
            auto: true, // 自动上传
            multi: true, // 允许上传多个照片
            init: true, // 默认初始化
            clickable: true, // 拖拽敏感区域是否可点击
            fileInput: null, // HTML file控件
            txtFileTooBig: "文件上传限制最大为{{maxFilesize}}.",
            txtInvalidFileType: "不允许的文件类型",
            txtMaxFilesExceeded: "最多能上传{{maxFiles}}个文件",
            txtRemoveTips: "您确定要移除这个文件吗？",
            txtCancelUploadTips: "您确定要取消上传吗？",
            /*
            Callbacks:
            */
            onDragOver: function(){}, // 文件拖拽到敏感区域时
            onDragLeave: function(){}, // 文件离开到敏感区域时            
            onDrop: function(file){}, // 文件选择后
            onProgress: function(file, loaded, total){}, // 文件上传进度
            onSuccess: function(file, message){}, // 文件上传成功时
            onError: function(file, message){}, // 文件上传失败时
            onCanceled: function(file){}, // 上传取消后
            onDelete: function(file, message){}, // 文件删除后
            onComplete: function(){} // 文件全部上传完毕时
        };
        // Extend defaults with parameters
        for (var param in params) {
            defaults[param] = params[param];
        }

        this.params = defaults || {};

        this.files = []; // 过滤后的文件数组队列

        this.container = container; // 拖拽敏感区域

        // 初始化可选参数
        if (typeof this.container === "string") {
            this.container = document.querySelector(this.container);
        }
        if (!(this.container && (this.container.nodeType !== null))) {
            throw new Error("Invalid dropup container.");
        }
        if (typeof this.params.fileInput === "string") {
            this.params.fileInput = document.querySelector(this.params.fileInput);
        }
        if (!(this.params.fileInput && (this.params.fileInput.nodeType !== null))) {
            throw new Error("Invalid fileInput.");
        }
        
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
                // if (file.type.indexOf("image") === 0
                //         || (!file.type && /\.(?:jpg|png|gif)$/.test(file.name))) {

                var fileExt = file.name.substring(file.name.lastIndexOf('.'));
                if(this.params.allowExts == null || this.params.allowExts.indexOf(fileExt) != -1) {
                    if (file.size >= this.params.maxFilesize * 1000) {
                        file.status = ERROR;
                        file.errmsg = this.params.txtFileTooBig.replace("{{maxFilesize}}", Dropup.fileSize(this.params.maxFilesize * 1000));
                    }
                } else {
                    file.status = ERROR;
                    file.errmsg = this.params.txtInvalidFileType;
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
                file.upload = {
                    progress: 0,
                    total: file.size,
                    bytesSent: 0
                };
                file.id = Dropup.getId();
                file.src = Dropup.getSrc(file);

                this.files.push(file);

                if (file.status !== ERROR) {
                    this.enqueueFile(file);
                    this.params.onDrop(file);
                } else {
                    this.params.onError(file, file.errmsg);
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

        //单个文件上传完成，解析数据
        du.uploadComplete = function(file, responseText) {    
            try {
                var json = eval("(" + responseText + ")");//JSON.parse(responseText);
                if (json.code === 0) {// 上传成功
                    file.url = json.data.path;
                    this.uploadSuccess(file, '上传成功');
                } else {//上传失败
                    this.uploadError(file, json.message);
                }
            } catch (_error) {
                this.uploadError(file, "Invalid JSON response from server.");
            }
        };
        // 单个文件上传成功，触发外部onSuccess事件
        du.uploadSuccess = function(file, message) {
            file.status = SUCCESS;
            this.params.onSuccess(file, message);

            if (this.params.auto) {
                this.processQueue();
            }
        };
        // 单个文件上传失败，触发外部onError事件
        du.uploadError = function(file, message) {
            file.status = ERROR;
            this.params.onError(file, message);

            if (this.params.auto) {
                this.processQueue();
            }
        };

        // 单文件上传
        du.uploadFile = function(file) {
            var self = this;

            // 非站点服务器上运行
            if (location.host.indexOf("sitepointstatic") >= 0) {
                self.uploadError(file, "非站点服务器上运行");
                return;
            }
            file.status = UPLOADING;

            var xhr = new XMLHttpRequest();
            file.xhr = xhr;

            xhr.open(this.params.method, this.params.url, true);
            xhr.withCredentials = !!this.params.withCredentials;

            if (xhr.upload) {
                // 上传中
                xhr.upload.addEventListener("progress", function(e) {
                    self.params.onProgress(file, e.loaded, e.total);
                }, false);

                // 文件上传成功或是失败
                xhr.onreadystatechange = function(e) {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            self.uploadComplete(file, xhr.responseText);
                            if (self.getQueuedFiles().length === 0
                                    && self.getUploadingFiles().length === 0) {
                                // 全部完毕
                                self.params.onComplete();
                            }
                        } else {
                            self.uploadError(file, xhr.responseText);
                        }
                    }
                };

                // FormData属于XMLHttpRequest Level 2的，
                // 它可以很快捷的模拟Form表单数据并通过AJAX发送至后端，
                // FF5+，Chrome12+
                var formData = new FormData();
                formData.append('file', file);

                xhr.send(formData);
            }
        };

        // 初始化
        du.init = function() {
            var self = this;
            // 绑定容器的dragover、dragover、drop事件
            this.container.addEventListener("dragover", function(e) {
                self.onDragHover(e);
            }, false);
            this.container.addEventListener("dragleave", function(e) {
                self.onDragHover(e);
            }, false);
            this.container.addEventListener("drop", function(e) {
                self.addFiles(e);
            }, false);

            // 文件选择控件选择
            if (this.params.clickable && this.params.fileInput) {
                // 绑定容器click事件
                self.container.addEventListener("click", function(e) {
                    // 兼容手机浏览器单击无效果的问题
                    if(Dropup.isMobileDevice()) {
                        setTimeout(function() {
                            self.params.fileInput.click();
                        }, 1000);// 必须为1000ms
                    } else {
                        self.params.fileInput.click();
                    }
                });

                //解除容器内部元素click事件
                //...【外部可能需要】

                // 绑定文件选择器change事件
                self.params.fileInput.addEventListener("change", function(e) {
                    self.addFiles(e);
                }, false);
            }

            // 检测是否支持HTML5上传
            if (window.File && window.FileList && window.FileReader && window.Blob) {
                /*this.upButton.addEventListener("click", function(e) {
                    self.processQueue();
                }, false);*/
            } else {
                alert("您的浏览器不支持HTML5上传");
            }
        };

        // ////////* 外部事件 *//////////

        //上传文件，一般事件绑定在“上传按钮”上
        du.doUpload = function() {
            this.processQueue();
        };
        // 删除文件，根据文件ID
        // 取消上传 1、待上传；2、上传中; 3、已上传
        du.doDelete = function(id) {
            
            if (this.params.txtRemoveFileConfirmation
                && !window.confirm(this.params.txtRemoveFileConfirmation)) {
                return false;
            }

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

                // 激活本地取消事件
                this.params.onCanceled(file);
            }
            // 被移除的文件是取消状态
            file.status = CANCELED;

            // 激活本地移除事件
            this.params.onDelete(file);

            if (this.params.auto) {
                return this.processQueue();
            }
        };


        /* 工具方法 */

        // 检测是否是移动端
        Dropup.isMobileDevice = function() {
            var ua = navigator.userAgent.toLowerCase();
            return ua.match(/iphone|ipad|ipod|android|symbianos|windows phone/) ? true : false;
        }
        //转文件大小
        Dropup.fileSize = function(size) {
            var string;
            if (size >= (1000 * 1000)) {
                size = Math.round((size / (1000 * 1000)) * 100) / 100;// 保留两位小数
                string = "MB";
            } else if (size >= 1000) {
                size = Math.round(size / 1000);
                string = "KB";
            } else {
                string = "B";
            }
            return size + string;
        };
        //生成随机数ID
        Dropup.getId = function() {
            var time = new Date().getTime();
            var rand = Math.random()
            if(rand < 0.1) rand += 0.1;
            rand = Math.round(rand * 1000);

            return "" + time + rand;
        };
        //获取文件Src
        Dropup.getSrc = function(file) {
            if (file.type.indexOf("image") === 0
                || (!file.type && /\.(?:jpg|png|gif)$/.test(file.name))) {
                return Dropup.getImageSrc(file)
            }
            return Dropup.getFileSrc(file);
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

        // 读取文件预设封面src
        Dropup.getFileSrc = function(file) {
            var name = file.name;
            var ext = name.substring(name.lastIndexOf(".") + 1, name.length);
            var fileExt = ['txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rar', 'zip'];
            var src = fileExt.indexOf(ext) != -1 ? 'file_' + ext + '.jpg' : 'file_default.jpg';

            if(this.params.fileExtDir) {
                if(this.params.fileExtDir.lastIndexOf('/') == -1) {
                    this.params.fileExtDir + '/';
                }
                return this.params.fileExtDir + fileExt;
            }
            return src;
        };

        // 默认初始化
        if (this.params.init) this.init();

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
