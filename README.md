#HTML5 Based File Uploader
#Dropup

##使用方法

#####引入Dropup文件

CommonJS 方式引用
```
var Dropup = require('dropup.js');
```

AMD var Dropup = require('dropup.js');
```
define(['./dropup'], function(Dropup) {
    // ...
});
```

全局方式，在HTML页面中引入:
```
<script src="dropup.min.js"></script>
```


###HTML代码
上传多个文件时，file input要添加multiple属性
```
<div class="dropup-avatar">
    <img class="album-image" style="width: 100%; height:120px;" src="default.jpg" />
    <input id="album-image" type="hidden" name="avatar" />
    <input class="du-fileinput" type="file" accept="image/*" hidden="hidden" style="display:none;" />
</div>
```
###Javascript代码
```
new Dropup(container, params);
```
Example：
```
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
```

##参数
### 构造参数
|参数|类型|默认值|说明
|-|-|-|
|container|string||拖拽敏感区域
|params|object|{}|可选参数
|url|string|null|ajax上传地址
|method|string|POST|提交方式
|withCredentials|boolean|false|支持跨域发送cookies
|allowExts|string|null|允许的文件类型，`jpeg,png,gif`,多个类型使用逗号`,`隔开
|fileExtDir|string|null|默认文件类型图片目录地址
|maxFiles|int|null|最大上传数
|maxFilesize|int|256|单个文件限制 KB
|parallelUploads|int|2|并行上传量，在进行多文件同时上传时的并发量
|auto|boolean|true|自动上传，选择文件后自动执行上次文件动作
|multi|boolean|true|允许多文件上传，头像修改建议设为false，或者将file input的multiple去掉
|init|boolean|true|默认初始化
|clickable|boolean|拖拽敏感区域是否可点击
|fileInput|string|null|HTML file控件
|txtFileTooBig|string|文件上传限制最大为{{maxFilesize}}.|文件大小超过限制
|txtInvalidFileType|string|不允许的文件类型|文件类型不允许
|txtMaxFilesExceeded|string|文件数量超限|
|txtRemoveTips|string|您确定要移除这个文件吗？|
|txtCancelUploadTips|string|"您确定要取消上传吗？|
|onDragHover|function||文件拖放，(注意)dragover事件一定要清除默认事件，不然会无法触发后面的drop事件
|onDragOver|function(){}||文件拖拽到敏感区域时
|onDragLeave|function(){}||文件离开到敏感区域时            
|onDrop|function(file){}||文件选择后
|onProgress|function(file, loaded, total){}||文件上传进度
|onSuccess|function(file, message){}||文件上传成功时
|onError|function(file, message){}||文件上传失败时
|onCanceled|function(file){}||上传取消后
|onDelete|function(file, message){}||文件删除后
|onComplete|function(){}||文件全部上传完毕时
