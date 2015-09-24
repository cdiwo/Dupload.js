#HTML5 Based File Uploader
#Dropup

##使用方法

引入Dropup文件
&lt;script src="/path/to/dropup.min.js"&gt;&lt;/script&gt; 

###HTML代码
上传多个文件时，file input要添加multiple属性

	<div class="dropup-avatar">
	    <img class="album-image" style="width: 100%; height:120px;" src="default.jpg" />
	    <input id="album-image" type="hidden" name="avatar" />
	    <input class="du-fileinput" type="file" accept="image/*" hidden="hidden" style="display:none;" />
	</div>

###Javascript代码

	new Dropup(".dropup-avatar", {
	    url: "http://localhost/upload",
	    fileInput: ".du-fileinput",
	    maxFilesize: 500,
	    onSuccess: function(file, message) {
	        $('.album-image').attr('src', 'http://localhost/' + file.url);
	        $('#album-image').val(file.url);
	    },
	    onError: function(file, message) {
	        alert(message);
	    }
	});

##参数
### 构造参数
	container 拖拽敏感区域

	params 参数
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
            txtMaxFilesExceeded: "文件数量超限",
            txtRemoveTips: "您确定要移除这个文件吗？",
            txtCancelUploadTips: "您确定要取消上传吗？",
            /*
            Callbacks:
            */
            // 文件拖放
            // (注意)dragover事件一定要清除默认事件
            // 不然会无法触发后面的drop事件
            onDragHover: function(e) {
                e.stopPropagation();
                e.preventDefault();
                e.type === "dragover" ? du.params.onDragOver() : du.params.onDragLeave();
            },
            onDragOver: function(){}, // 文件拖拽到敏感区域时
            onDragLeave: function(){}, // 文件离开到敏感区域时            
            onDrop: function(file){}, // 文件选择后
            onProgress: function(file, loaded, total){}, // 文件上传进度
            onSuccess: function(file, message){}, // 文件上传成功时
            onError: function(file, message){}, // 文件上传失败时
            onCanceled: function(file){}, // 上传取消后
            onDelete: function(file, message){}, // 文件删除后
            onComplete: function(){} // 文件全部上传完毕时
