#HTML5 Based File Uploader
#Dropup

##使用方法

#####引入Dropup文件

CommonJS 方式引用
```
var Dropup = require('dropup.js');
```

AMD 方式引用
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
###服务器端
数据返回格式必须为json格式，数据结构如下：</br>
code: 0：表示正常，> 0的值表示有错误</br>
message: 提示信息</br>
data: 返回数据
```
{"code": 0, "message": "ok", "data": {"path": "upload/avatar/example.jpg"}}
```
##参数
### 
<table>
<thead>

<tr>
  <th>参数</th>
  <th>类型</th>
  <th>默认值</th>
  <th>说明</th>
</tr>
</thead>
<tbody>
<tr><th colspan="4">构造参数</th></tr>
<tr>
  <td>container</td>
  <td>string</td>
  <td></td>
  <td>拖拽敏感区域</td>
</tr>
<tr>
  <td>params</td>
  <td>object</td>
  <td>{}</td>
  <td>可选参数</td>
</tr>
<tr>
  <th colspan="4">params参数</th>
</tr>
<tr>
  <td>url</td>
  <td>string</td>
  <td>null</td>
  <td>ajax上传地址</td>
</tr>
<tr>
  <td>method</td>
  <td>string</td>
  <td>POST</td>
  <td>提交方式</td>
</tr>
<tr>
  <td>withCredentials</td>
  <td>boolean</td>
  <td>false</td>
  <td>支持跨域发送cookies</td>
</tr>
<tr>
  <td>allowExts</td>
  <td>string</td>
  <td>null</td>
  <td>允许的文件类型，<code>jpeg,png,gif</code>,多个类型使用逗号<code>,</code>隔开</td>
</tr>
<tr>
  <td>fileExtDir</td>
  <td>string</td>
  <td>null</td>
  <td>默认文件类型图片目录地址</td>
</tr>
<tr>
  <td>maxFiles</td>
  <td>int</td>
  <td>null</td>
  <td>最大上传数</td>
</tr>
<tr>
  <td>maxFilesize</td>
  <td>int</td>
  <td>256</td>
  <td>单个文件限制 KB</td>
</tr>
<tr>
  <td>parallelUploads</td>
  <td>int</td>
  <td>2</td>
  <td>并行上传量，在进行多文件同时上传时的并发量</td>
</tr>
<tr>
  <td>auto</td>
  <td>boolean</td>
  <td>true</td>
  <td>自动上传，选择文件后自动执行上次文件动作</td>
</tr>
<tr>
  <td>multi</td>
  <td>boolean</td>
  <td>true</td>
  <td>允许多文件上传，头像修改建议设为false，或者将file input的multiple去掉</td>
</tr>
<tr>
  <td>init</td>
  <td>boolean</td>
  <td>true</td>
  <td>默认初始化</td>
</tr>
<tr>
  <td>clickable</td>
  <td>boolean</td>
  <td>拖拽敏感区域是否可点击</td>
  <td></td>
</tr>
<tr>
  <td>fileInput</td>
  <td>string</td>
  <td>null</td>
  <td>HTML file控件</td>
</tr>
<tr>
  <th colspan="4">提示文字(Tips Text)</th>
</tr>
<tr>
  <td>txtFileTooBig</td>
  <td>string</td>
  <td>文件上传限制最大为{{maxFilesize}}.</td>
  <td>文件大小超过限制</td>
</tr>
<tr>
  <td>txtInvalidFileType</td>
  <td>string</td>
  <td>不允许的文件类型</td>
  <td>文件类型不允许</td>
</tr>
<tr>
  <td>txtMaxFilesExceeded</td>
  <td>string</td>
  <td>文件数量超限</td>
  <td></td>
</tr>
<tr>
  <td>txtRemoveTips</td>
  <td>string</td>
  <td>您确定要移除这个文件吗？</td>
  <td></td>
</tr>
<tr>
  <td>txtCancelUploadTips</td>
  <td>string</td>
  <td>“您确定要取消上传吗？</td>
  <td></td>
</tr>
<tr>
  <th colspan="4">回调函数（Callback)</th>
</tr>
<tr>
  <td>onDragHover</td>
  <td>function</td>
  <td></td>
  <td>文件拖放，(注意)dragover事件一定要清除默认事件，不然会无法触发后面的drop事件</td>
</tr>
<tr>
  <td>onDragOver</td>
  <td>function(){}</td>
  <td></td>
  <td>文件拖拽到敏感区域时</td>
</tr>
<tr>
  <td>onDragLeave</td>
  <td>function(){}</td>
  <td></td>
  <td>文件离开到敏感区域时</td>
</tr>
<tr>
  <td>onDrop</td>
  <td>function(file){}</td>
  <td></td>
  <td>文件选择后</td>
</tr>
<tr>
  <td>onProgress</td>
  <td>function(file, loaded, total){}</td>
  <td></td>
  <td>文件上传进度</td>
</tr>
<tr>
  <td>onSuccess</td>
  <td>function(file, message){}</td>
  <td></td>
  <td>文件上传成功时</td>
</tr>
<tr>
  <td>onError</td>
  <td>function(file, message){}</td>
  <td></td>
  <td>文件上传失败时</td>
</tr>
<tr>
  <td>onCanceled</td>
  <td>function(file){}</td>
  <td></td>
  <td>上传取消后</td>
</tr>
<tr>
  <td>onDelete</td>
  <td>function(file, message){}</td>
  <td></td>
  <td>文件删除后</td>
</tr>
<tr>
  <td>onComplete</td>
  <td>function(){}</td>
  <td></td>
  <td>文件全部上传完毕时</td>
</tr>
</tbody></table>
