#HTML5 Based File Uploader
#Dropup

##使用方法

引入Dropup文件
<script src="/path/to/dropup.min.js"></script> 

###HTML代码
上传多个文件时，file input要添加multiple属性

	<div class="col-sm-2 dropup-avatar">
	    <img class="album-image" style="width: 100%; height:120px;" src="default.jpg" />
	    <input id="album-image" type="hidden" name="avatar" />
	    <input class="du-fileinput" type="file" accept="image/*" hidden="hidden" style="display:none;" />
	</div>

###Javascript代码

	new Dropup(".dropup", {
	    url: "http://localhost/upload",
	    fileInput: "#fileInput",
	    auto: false,
	    txtRemoveFileConfirmation: null,
	    maxFilesize: 500,
	    onSuccess: function(file, message) {
	        $('.album-image').attr('src', 'http://localhost/' + file.url);
	        $('#album-image').val(file.url);
	    },
	    onError: function(file, message) {
	        alert(message);
	    }
	});