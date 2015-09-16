/**
 * Jquery Function Extends JS Fundation Use Template.js extends plugin. 
 * Version: 1.0 
 * Description: HTML5 input selected or drop files to mutilpile upload.
 * Author: David Wei <weiguangchun@gmail.com>
 * Copyright: (c)2014 CDIWO Inc. All Copyright Reserved. 
 * Website: www.chadoucms.com
 * Date: 2014-10-24 15:30
 */

var Dropup = function(element, options) {
    var defaultOptions = {
        url: null, // ajax地址
        method: "POST", // 提交方式
        withCredentials: false,
        allowExts: null, // 待上传的文件类型
        maxFiles: null, // 最大上传数
        maxFilesize: 256, // 单个文件最大 KB
        parallelUploads: 2, // 并行上传量
        auto: true, // 自动上传
        multi: true, // 允许上传多个照片
        clickable: true, // 拖拽敏感区域是否可点击
        fileInput: null, // HTML file控件
        txtFileTooBig: "文件过大，上传的文件最大为{{maxFilesize}}KB.",
        txtInvalidFileType: "不允许的文件类型",
        txtMaxFilesExceeded: "文件数量超限",
        txtRemoveTips: "您确定要移除这个文件吗？",
        txtCancelUploadTips: "您确定要取消上传吗？"
    };

    this.options = defaultOptions;
    options && jQuery.extend(this.options, options);

    this.files = []; // 过滤后的文件数组队列

    this.element = element; // 拖拽敏感区域

    // 初始化可选参数
    if (typeof this.element === "string") {
        this.element = document.querySelector(this.element);
    }
    if (!(this.element && (this.element.nodeType !== null))) {
        throw new Error("Invalid dropup element.");
    }
    if (typeof this.options.fileInput === "string") {
        this.options.fileInput = document.querySelector(this.options.fileInput);
    }
    if (!(this.options.fileInput && (this.options.fileInput.nodeType !== null))) {
        throw new Error("Invalid fileInput.");
    }

};

Dropup.name = "HTML5文件拖拽上传插件";
Dropup.version = "1.2.0";
Dropup.description = "插件界面显示由v1.1版本的内部操作转换为外部操作，增强用户界面自定义可操作性。";
Dropup.createTime = "2015.02.14 22:50:20";

// ////////* 开发参数和内部事件方法分界线 *//////////

// 根据文件状态获取
Dropup.prototype.getFilesWithStatus = function(status) {
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
Dropup.prototype.getQueuedFiles = function() {
    return this.getFilesWithStatus(Dropup.QUEUED);
};

// 获取正在上传的文件
Dropup.prototype.getUploadingFiles = function() {
    return this.getFilesWithStatus(Dropup.UPLOADING);
};

// 获取上传成功的文件
Dropup.prototype.getSuccessFiles = function() {
    return this.getFilesWithStatus(Dropup.SUCCESS);
};

// 过滤器
Dropup.prototype.filter = function(files) {
    var arrFiles = [];
    for (var i = 0, file; file = files[i]; i++) {
        // if (file.type.indexOf("image") === 0
        //         || (!file.type && /\.(?:jpg|png|gif)$/.test(file.name))) {

        var fileExt = file.name.substring(file.name.lastIndexOf('.'));
        if(this.options.allowExts == null || this.options.allowExts.indexOf(fileExt) != -1) {
            if (file.size >= this.options.maxFilesize * 1000) {
                file.status = Dropup.ERROR;
                file.errmsg = "文件大小应小于" + this.options.maxFilesize + "KB";
            }
        } else {
            file.status = Dropup.ERROR;
            file.errmsg = "不允许的文件类型";
        }
        arrFiles.push(file);
    }
    return arrFiles;
};

// 获取选择文件，file控件或拖放
Dropup.prototype.addFiles = function(e) {
    // 取消鼠标经过样式
    this.onDragHover(e);

    // 获取文件列表对象
    var files = e.target.files || e.dataTransfer.files;

    // 过滤文件
    var acceptFiles = this.filter(files);

    // 不允许多文件上传的时候只取其中一个文件
    if (!this.options.multi && acceptFiles.length > 1) {
        acceptFiles = [acceptFiles[0]];
    }

    // 必须小于最大上传量
    if (this.options.maxFiles
            && (this.options.maxFiles < this.files.length + acceptFiles.length)) {
        alert(this.options.txtMaxFilesExceeded);
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

        if (file.status !== Dropup.ERROR) {
            this.enqueueFile(file);
            this.onDrop(file);
        } else {
            this.onError(file, file.errmsg);
        }
    }
    return this;
};

// 文件入队 ＝> 1、改变状态；2、处理队列
Dropup.prototype.enqueueFile = function(file) {
    file.status = Dropup.QUEUED;
    if (this.options.auto) {
        return setTimeout(((function(_this) {
            return function() {
                return _this.processQueue();
            };
        })(this)), 0);
    }
};

// 处理队列 => 1、判断是否达到最大处理数，2、非自动上传，默认最大同时处理10个文件
Dropup.prototype.processQueue = function() {
    var parallelUploads = this.options.auto ? this.options.parallelUploads : 10;
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
Dropup.prototype.uploadComplete = function(file, responseText) {    
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
Dropup.prototype.uploadSuccess = function(file, message) {
    file.status = Dropup.SUCCESS;
    this.onSuccess(file, message);

    if (this.options.auto) {
        this.processQueue();
    }
};
// 单个文件上传失败，触发外部onError事件
Dropup.prototype.uploadError = function(file, message) {
    file.status = Dropup.ERROR;
    this.onError(file, message);

    if (this.options.auto) {
        this.processQueue();
    }
};

// 单文件上传
Dropup.prototype.uploadFile = function(file) {
    var self = this;

    // 非站点服务器上运行
    if (location.host.indexOf("sitepointstatic") >= 0) {
        self.uploadError(file, "非站点服务器上运行");
        return;
    }
    file.status = Dropup.UPLOADING;

    var xhr = new XMLHttpRequest();
    file.xhr = xhr;

    xhr.open(this.options.method, this.options.url, true);
    xhr.withCredentials = !!this.options.withCredentials;

    if (xhr.upload) {
        // 上传中
        xhr.upload.addEventListener("progress", function(e) {
            self.onProgress(file, e.loaded, e.total);
        }, false);

        // 文件上传成功或是失败
        xhr.onreadystatechange = function(e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    self.uploadComplete(file, xhr.responseText);
                    if (self.getQueuedFiles().length === 0
                            && self.getUploadingFiles().length === 0) {
                        // 全部完毕
                        self.onComplete();
                    }
                } else {
                    self.uploadError(file, xhr.responseText);
                }
            }
        };

        // 开始上传
        // xhr.open("POST", self.url, true);

        // FormData属于XMLHttpRequest Level 2的，
        // 它可以很快捷的模拟Form表单数据并通过AJAX发送至后端，
        // FF5+，Chrome12+
        var formData = new FormData();
        formData.append('file', file);

        xhr.send(formData);
    }
};

// ////////* 内部事件与外部事件与函数分界线 *//////////

// 文件拖放
// (注意)dragover事件一定要清除默认事件
// 不然会无法触发后面的drop事件
Dropup.prototype.onDragHover = function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.type === "dragover" ? this.onDragOver() : this.onDragLeave();
};
// 文件拖拽到敏感区域时
Dropup.prototype.onDragOver = function() {
};
// 文件离开到敏感区域时
Dropup.prototype.onDragLeave = function() {
};
// 文件选择后
Dropup.prototype.onDrop = function(file) {
};
// 文件上传进度
Dropup.prototype.onProgress = function(file, loaded, total) {
};
// 文件上传成功时
Dropup.prototype.onSuccess = function(file, message) {
};
// 文件上传失败时
Dropup.prototype.onError = function(file, message) {
};
// 文件删除后
Dropup.prototype.onDelete = function(file) {
};
// 文件全部上传完毕时
Dropup.prototype.onComplete = function() {
};

//上传文件，一般事件绑定在“上传按钮”上
Dropup.prototype.doUpload = function() {
    this.processQueue();
};
// 删除文件，根据文件ID
// 取消上传 1、待上传；2、上传中; 3、已上传
Dropup.prototype.doDelete = function(id) {
//    if (this.options.txtRemoveFileConfirmation
//            && !window.confirm(this.options.txtRemoveFileConfirmation)) {
//        return false;
//    }

    //查找文件
    var file, i = 0;
    while (i < this.files.length && (file = this.files[i]).id !== id)
        i++;

    // 取消正在上传的文件
    if (file.status === Dropup.UPLOADING) {
//        if (this.options.txtCancelUploadTips
//                && !window.confirm(this.options.txtCancelUploadTips)) {
//            return false;
//        }

        file.xhr.abort();

        // 激活本地取消事件
        //this.onCanceled(file);
    }
    // 被移除的文件是取消状态
    file.status = Dropup.CANCELED;

    // 激活本地移除事件
    this.onDelete(file);

    if (this.options.auto) {
        return this.processQueue();
    }
};

// ////////* 外部事件与内部事件与函数分界线 *//////////


// 初始化
Dropup.prototype.init = function() {
    var self = this;

    // 绑定容器的dragover、dragover、drop事件
    this.element.addEventListener("dragover", function(e) {
        self.onDragHover(e);
    }, false);
    this.element.addEventListener("dragleave", function(e) {
        self.onDragHover(e);
    }, false);
    this.element.addEventListener("drop", function(e) {
        self.addFiles(e);
    }, false);

    // 文件选择控件选择
    if (this.options.clickable && this.options.fileInput) {
        // 绑定容器click事件
        $(this.element).on("click", function(e) {
            self.options.fileInput.click();
        });

        //解除容器内部元素click事件
        //...【外部可能需要】

        // 绑定文件选择器change事件
        this.options.fileInput.addEventListener("change", function(e) {
            self.addFiles(e);
        });
    }

    // 检测是否支持HTML5上传
    if (window.File && window.FileList && window.FileReader && window.Blob) {
        // this.upButton.addEventListener("click", function(e) {
        // self.processQueue();
        // }, false);
    } else {
        alert("您的浏览器不支持HTML5上传");
    }
};


// 状态
Dropup.QUEUED = "queued";
Dropup.UPLOADING = "uploading";
Dropup.CANCELED = "canceled";
Dropup.ERROR = "error";
Dropup.SUCCESS = "success";

// 文件类型
Dropup.TYPE_IMAGE = 'image';
Dropup.TYPE_FILE = 'file';


/* 工具方法 */

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
    var rand = (mm = Math.random()) > 0.1 ? mm : mm + 0.1;
    rand = Math.round(rand * 1000);

    return "" + time + rand;
};
//获取文件Src
Dropup.getSrc = function(file) {
    return file.type === Dropup.TYPE_FILE ? Dropup.getFileSrc(file) : Dropup.getImageSrc(file);
};
// 读取图片src
Dropup.getImageSrc = function(file) {
    var src = null;
    // 多浏览器兼容性
    if (window.URL.createObjectURL) {// $.browser.safari
        // FF4+
        src = window.URL.createObjectURL(file);

        // window.URL.createObjectURL是有生命周期的，也就意味着你每用此方法获取URL，
        // 其生命周期都会和DOM一样，它会单独占用内存，所以当删除图片或不再需要它是，
        // 记得用window.URL.revokeObjectURL(file)来释放其内存。当然，如果你没有释放，刷新页面也是可以释放的。
        window.URL.revokeObjectURL(file);
    } else if (window.webkitURL.createObjectURL) {// $.browser.mozilla
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
    return fileExt.indexOf(ext) != -1 ? './file_' + ext + '.jpg' : './file_default.jpg';
};
