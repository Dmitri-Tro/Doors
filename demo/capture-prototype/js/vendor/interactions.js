'use strict';
var colorRgb;
function Interactions() {
    return {
        createContentWrapper: createContentWrapper,
        toggleMenu: toggleMenu,
        hideMenu: hideMenu,
        toggleGallery: toggleGallery,
        showGallery: showGallery,
        hideGallery: hideGallery,
        hideControlPanel: hideControlPanel,
        toggleControlPanel: toggleControlPanel,
        toggleSettingsPanel: toggleSettingsPanel,
        collapseMenu: collapseMenu,
        initTabs: initTabs,
        initShareCallbacks: initShareCallbacks,
        languageSwitcherInteractions: languageSwitcherInteractions,
        appendTemplate: appendTemplate,
        onAskHotspotRemoveCallback: onAskHotspotRemoveCallback,
        hideElement: hideElement,
        initPopupSelect: initPopupSelect,
        zoomPluginInitialization: zoomPluginInitialization,
        mapPluginInitialization: mapPluginInitialization,
        setGalleryActiveItem: setGalleryActiveItem,
        galleryInitialization: galleryInitialization,
        loadMainThemColor: loadMainThemColor,
        addMandatoryField: addMandatoryField,
        registerCallbackAndHandleResult: registerCallbackAndHandleResult,
        contactUsCallbackAndHandleResult : contactUsCallbackAndHandleResult,
        tooltipsToggle: tooltipsToggle,
        initFloorplan: initFloorplan,
        screenshotAreaInitialization: screenshotAreaInitialization,
        addStyleToHeader: addStyleToHeader,
        showActiveFloorSlider: showActiveFloorSlider,
        lightboxInitialization: lightboxInitialization,
        editModeInitialization: editModeInitialization,
        fb_api_call: fb_api_call,
        fb_login: fb_login,
        handleUploadedFileAndReturnUrl: handleUploadedFileAndReturnUrl,
        initCustomScrollBar: initCustomScrollBar,
        initModalsReactivateExpiredCallbacks: initModalsReactivateExpiredCallbacks,
        initLanguageSwitcherChooseFallack: initLanguageSwitcherChooseFallack
    };

    function initCustomScrollBar() {
        $(".info-page, .contact-page, .share-page").mCustomScrollbar();
    }

    function onAskHotspotRemoveCallback(detectedEvent, plugin){
        var modal = plugin.krpanoEmbeded.find("#ask-hotspot-modal");
        modal.on(detectedEvent, '.remove-hotspot', function() {
            var hotspotName = modal.attr("attr-hotspotName");
            plugin.removeHotspot(hotspotName);
            modal.modal('hide');
        });
        modal.on(detectedEvent, '.go-to-room', function() {
            var fileName=modal.attr("attr-fileName");
            var hotspotName = modal.attr("attr-hotspotName");
            var activeCarouselId = modal.attr("attr-activeCarouselId");
            plugin.loadThiScene(fileName, hotspotName, activeCarouselId);
            modal.modal('hide');
        });
    }

    function showHideCollapseControlIcon(){
        var showExposeInfo = null;
        $('#control-panel-right .panel-button').each(function (index, element) {
            if(!$(this).hasClass('hidden')) showExposeInfo = true;
        });
        showExposeInfo ? $('#collapse-control').removeClass('hidden') : $('#collapse-control').addClass('hidden')
    }

    function editModeInitialization(detectedEvent){
        var $uploadBtn;
        showHideCollapseControlIcon();
        $("#demo-setting").on(detectedEvent, function() {
            hideMenu();
            $(".demo").toggleClass("activate hidden");
            $(".demo").hasClass('activate') ? $(this).removeClass('left-0') : $(this).addClass('left-0');
        });
        $('.demo .checkbox').change(function () {
            var element = $(this).attr('data-name');
             if($(this).is(':checked')){
                 jsonData.visibility[element] = true;
                 $('#' + $(this).attr('data-element')).removeClass('hidden');
                 if ($(this).attr('data-name') === 'showWelcomeWindow') $('#welcome-modal').modal('show');
                 $('body').on(detectedEvent, function () {$('#welcome-modal').modal('hide');})
             } else {
                 jsonData.visibility[element] = false;
                 $('#' + $(this).attr('data-element')).addClass('hidden')
             }
            showHideCollapseControlIcon();
        });
        $(".upload-wrapper a").on(detectedEvent,function () {
            $uploadBtn = $(this).next();
            $uploadBtn.trigger('click');
            $uploadBtn.on('change', function() {
              var val = $(this).val();
              $(this).parent().next('span').text(val);
              var form = $(this).closest("form");
              handleUploadedFileAndReturnUrl(form[0], form.prop("id").replace("_upload_form", ""), $uploadBtn)
            });

        });

        $('#colorSelector2 div').css('backgroundColor', ' rgb(' + jsonData.styles.mainColor.r +','+ jsonData.styles.mainColor.g +','+ jsonData.styles.mainColor.b + ') ');
        $('#colorSelector2').ColorPicker({
            color: ({r:jsonData.styles.mainColor.r, g:jsonData.styles.mainColor.g, b:jsonData.styles.mainColor.b}) ,
            onChange: function(hsb, hex, color) {
                colorRgb = ' rgb(' + color.r +','+ color.g +','+ color.b + ') ';
                $('.them-color').css('backgroundColor', colorRgb);
                $('.slider-gallery-section .slider-gallery-wrapper .slider-element.active-element').css('border', '5px solid' + colorRgb);
                loadMainThemColor(color, detectedEvent);
                $('#colorSelector2 div').css('backgroundColor', colorRgb);
                jsonData.styles.mainColor.r = color.r;
                jsonData.styles.mainColor.g = color.g;
                jsonData.styles.mainColor.b = color.b;
            }
        });

        $('#colorpickerField1, #colorpickerField2, #colorpickerField3').ColorPicker({
            onSubmit: function(hsb, hex, rgb, el) {
                $(el).val(hex);
                $(el).ColorPickerHide();
            },
            onBeforeShow: function () {
                $(this).ColorPickerSetColor(this.value);
            }
        })
        .bind('keyup', function(){
            $(this).ColorPickerSetColor(this.value);
        });

        $('#save-list').on('change', function () {
            console.log($(this).val());
            if($(this).val() !== 'choose-email'){
                $('#save-changes-btn').removeAttr('disabled');
            } else{
                $('#save-changes-btn').attr('disabled', 'disabled');
            }
        });

        $('#save-changes-btn').on(detectedEvent, function () {
            savePlayerInitializazion($(this));
        });
    }

    function handleUploadedFileAndReturnUrl(form, image_type, button){
        var file = button[0].files[0];
        var name = file.name;
        var size = file.size;
        var type = file.type;
        $.ajax({
          url: window.jsonData.urls.backendUrls.storeLogo.replace("%7BTYPE%7D", image_type),
          type: 'POST',
          data: new FormData(form), // The form with the file inputs.
          cache: false,
          contentType: false,
          processData: false
        }).done(function(data){
            window.jsonData.styles[image_type] = data.details;
          processUrlsUpload(image_type, data.details);
        }).fail(function(){
          console.log("An error occurred, the files couldn't be sent!");
        });
    }

    function typeOfImage(type){
        type = type.toLowerCase();
        if(type.indexOf("jpeg") !== -1 || type.indexOf("jpg") !== -1 || type.indexOf("png") !== -1
            || type.indexOf("gif") !== -1){
                return "IMAGE";
        }else if(type.indexOf("mov") !== -1 || type.indexOf("mp4") !== -1 || type.indexOf("avi") !== -1
            || type.indexOf("mkv") !== -1){
            return "VIDEO";
        }else if(type.indexOf("pdf") !== -1){
            return "PDF";
        }
        return null;
    }

    function handleUploadedInfopointAndReturnUrl(form, button, plugin){
        var file = form.find("input[type=file]")[0].files[0];
        var name = file.name;
        var size = file.size;
        var type = file.type;

        var imageType=typeOfImage(file.type);
        //TODO: Handle it properly
        if(imageType === null)
            alert("This image Type is not supported");

        form.find("#toDelete").remove();
        $('<input>').attr({
            type: 'hidden',
            id: 'toDelete',
            name: 'type',
            value: 'unknown'
        }).appendTo(form);

        console.log("fileType=" + type + " name=" + name);
        var actualPano = $("#actualPano").val().replace("-_-", ".");
        var title = form.find("input[name=title]").val();
        var popOver=plugin.krpanoEmbeded.find("#popOverWrapper");
        plugin.addAttachment(popOver.css("left", popOver.css("top"), title, imageType));
        processUrlsUpload(image_type, data.details);
        /*
        $.ajax({
          url:  window.jsonData.urls.backendUrls.addAttachment.replace("%7BFILENAME%7D", actualPano),
          username: window.jsonData.username,
          password: window.jsonData.pass,
          type: 'POST',
          data: new FormData(form), // The form with the file inputs.
          cache: false,
          contentType: false,
          processData: false
        }).done(function(data){
            console.log("Done");
            var title = form.find("input[name=title]").val();
            var popOver=plugin.krpanoEmbeded.find("#popOverWrapper");
            plugin.addAttachment(popOver.css("left", popOver.css("top"), title, imageType));
            processUrlsUpload(image_type, data.details);
        }).fail(function(){
          console.log("fail");
        });
        */
    }

    function processUrlsUpload(image_type, url){
        if(image_type === 'logoUrl'){
            $("#company-logo img").attr("src", url);
        }else if(image_type === 'hotspotLogo'){
            $("#krpanoSWFObject")[0].get("hotspot").getArray().forEach(function(hotspot) {
               if(hotspot.name !== "logo_at_bottom")
                hotspot.url=url;
            })
        }else if(image_type === 'tripodCoverLogo'){
             $("#krpanoSWFObject")[0].get("hotspot[logo_at_bottom]").url=url;
         }else if(image_type === 'agentUrl'){
             $(".avatar-section img, .immo-popup.left-section img").attr("src", url);
         }
    }

    function savePlayerInitializazion(icon){
        var selected=$("select#editor-select-agent option:selected");
        var id = selected && selected.length > 0 && selected.val().length > 0 ? selected.val() : window.jsonData.ids.userID;
        var url = window.jsonData.urls.backendUrls.storePlayerInitialization.replace("%7BID%7D", id);
        icon.prop("disabled", true);
        var iconImage=icon.find("i");
        var oldClasses=iconImage.attr("class");
        iconImage.removeClass();
        iconImage.addClass("fa fa-spinner fa-spin fa-fw");
        var onSaveBlock=icon.parent();
        $.ajax({
            url: url,
            type: 'POST',
            data: JSON.stringify({visibility: window.jsonData.visibility, styles: window.jsonData.styles}),
            contentType: "application/json; charset=utf-8",
            dataType: 'json'
        }).success(function() {
              onSaveBlock.find(".success").show("fast");
              setTimeout(function () {
                  onSaveBlock.find(".success").hide("slow");
              },4000);
              console.log( "success" );
          })
        .fail(function() {
              onSaveBlock.find(".fail").show("fast");
              setTimeout(function () {
                  onSaveBlock.find(".fail").hide("slow");
              },4000);
              console.log("Fail")
        })
        .always(function() {
            icon.prop("disabled", false);
            iconImage.removeClass();
            iconImage.addClass(oldClasses);
        });
    }

    function lightboxInitialization(){
        $('.carousel-link').nivoLightbox();
    }

    function showActiveFloorSlider(activeFloorSlider){
        var activeFloorName;
        activeFloorSlider = !activeFloorSlider ? !$("#actualPlan").val() ? jsonData.tour.activeRoom.plan : $("#actualPlan").val() : activeFloorSlider;
        $('.owl-carousel').each(function () {
            var $this = $(this);
            var parent = $this.parent();
            parent.addClass('overflow-hidden');
            if($this.hasClass(activeFloorSlider)){
                activeFloorName = $(this).attr('data-activeFloorName');
                $this.removeClass('hidden');
                setTimeout(function () {
                    $this.removeClass('gallery-bottom-position');
                },100);
            } else{
                $this.addClass('gallery-top-position');
                setTimeout(function () {
                    $this.removeClass('gallery-top-position').addClass('hidden gallery-bottom-position');
                },1000);
            }
            setTimeout(function () {
                parent.removeClass('overflow-hidden');
            },1000);
        });

        !activeFloorName ? $('.dropdown-toggle .toggle-header').text('right.menu.floor.' + activeFloorSlider) : $('.dropdown-toggle .toggle-header').text(activeFloorName);
    }

    function getSnapshotAreaResolution(){
        $('.resolution-wrapper .resolution-width').text($('.snapshot-wrapper').width() + 6);
        $('.resolution-wrapper .resolution-height').text($('.snapshot-wrapper').height() + 6);
    }

    function screenshotAreaInitialization(detectedEvent, krpanoInterface, plugin, ratio){
        var runFirstTime = true;
        var $this = $('#krpanoSWFObject');
        var $snapshotIcon = $('#screenshotIcon');
        var drag = false;
        var sliderValue, number, snapshotWidth, snapshotHeight, snapshotMinWidthPercentage, snapshotMinWidth, snapshotMinHeight, ratioOption, ratioOption2;
        var screenWidth, screenHeight, newHeight, newWidth, ratioOption, ratioOption2;

        $snapshotIcon.on(detectedEvent, function (){
            if(runFirstTime){
                runFirstTime = false;
                //$('.snapshot-section').addClass('hidden');
            }
            if ($('.snapshot-section').hasClass('hidden')) getSnapshotAreaResolution();

            $('.snapshot-section').toggleClass('hidden');
            hideMenu();
            hideGallery(plugin);
            plugin.disablerotate();
        });

        $snapshotIcon.on(detectedEvent, function (){
            var sliderValue, number, snapshotWidth, snapshotHeight, snapshotMinWidthPercentage, snapshotMinWidth, snapshotMinHeight;
            var $snapshotWrapper =  $('.snapshot-wrapper');
            number = +$('#aspect-ratio-btn').attr('value');
            snapshotWidth = ratio[number].width;
            snapshotHeight = (ratio[number].v * snapshotWidth) / ratio[number].h;

            snapshotMinWidth = ratio[number].width;
            snapshotMinHeight = (ratio[number].v * snapshotWidth) / ratio[number].h;

            $snapshotWrapper.width(snapshotWidth).height(snapshotHeight);
            ratioOption = 4;
            ratioOption2 = 3;
            sliderValue = changeSliderMinMaxValue($snapshotWrapper, snapshotWidth, snapshotHeight, ratioOption, ratioOption2);

            $('.ratio-type').on(detectedEvent, function () {
                 $('#aspect-ratio-btn .active-text').text($(this).children('a').text());
                $('.ratio-type').each(function () {
                    $(this).removeClass('ratio-active')
                });
                $(this).addClass('ratio-active');
                number = +$(this).attr('value');
                snapshotMinWidth = ratio[number].width;
                snapshotMinHeight = (ratio[number].v * snapshotWidth) / ratio[number].h;

                snapshotWidth = $snapshotWrapper.width();
                snapshotHeight = (ratio[number].v * snapshotWidth) / ratio[number].h;

                ratioOption = ratio[number].h;
                ratioOption2 = ratio[number].v;
                $snapshotWrapper.width(snapshotWidth).height(snapshotHeight);

                changeSliderMinMaxValue($snapshotWrapper, snapshotMinWidth, snapshotMinHeight, ratioOption, ratioOption2);
                getSnapshotAreaResolution();
            });

            $this.bind('resizeEnd', function() {
                number = +$('.ratio-type.ratio-active').attr('value');
                snapshotMinWidth = ratio[number].width;
                snapshotMinHeight = (ratio[number].v * snapshotWidth) / ratio[number].h;
                changeSliderMinMaxValue($snapshotWrapper, snapshotMinWidth, snapshotMinHeight,  ratioOption, ratioOption2);
            });

            $this.resize(function() {
                if($(this).resizeTO) clearTimeout($(this).resizeTO);
                $(this).resizeTO = setTimeout(function() {
                    $this.trigger('resizeEnd');
                }, 500);
            });

             $('.drag-snapshot-area').on('mousedown', function () {
                drag = true;
             });
            $('body').on('mousemove', '#krpanoSWFObject', function (e) {
                if (!drag) return;
                var sizeObj = {};
                $('.drag-snapshot-area').on('dragstart', function(event) { event.preventDefault(); });
                screenWidth = $(this).width();
                screenHeight = $(this).height();
                newWidth =  screenWidth - 2 * e.clientX;
                newHeight = screenHeight - 2 * e.clientY;
                sizeObj['width'] = newWidth;
                sizeObj['height'] = newHeight;
                $('.drag-snapshot-area').tooltip('hide');
                changeSnapshotSize(sizeObj, ratioOption, ratioOption2);
                getSnapshotAreaResolution();
            }).on('mouseup', function () {
                drag = false;
            }).on('hover', function () {
                $('.drag-snapshot-area').tooltip('show');
            });
        });

        $('body').on(detectedEvent, '.snapshot-btn', function () {
            var $snapshotWrapper = $('.snapshot-wrapper');
            var x1 = $snapshotWrapper.offset().left, y1 = $snapshotWrapper.offset().top;
            var width = $snapshotWrapper.width();
            var height = $snapshotWrapper.height();
            var x2 = x1 + width, y2 = y1 + height;

            var middleTop = krpanoInterface.screentosphere(x1+width/2, y1);
            var middleBottom = krpanoInterface.screentosphere(x1+width/2, y2);
            var frameFov = Math.abs(middleTop.y - middleBottom.y);
            var centerX = krpanoInterface.get("view.hlookat");
            var centerY = -krpanoInterface.get("view.vlookat");
            // local testing:
            //var url = "http://localhost:8080/render?x=1.0&y=2.0&fov=3.0&width=1&height=2"
            var url = window.jsonData.urls.backendUrls.takeScreens
                .replace("x=1.0", "x=" + centerX)
                .replace("y=2.0", "y=" + centerY)
                .replace("fov=3.0", "fov=" + frameFov)
                .replace("%7BFILENAME%7D", $("#actualPano").prop("value"))
                .replace("width=1", "width=" + width)
                .replace("height=2", "height=" + height);
            var $downloadFile=$("#downloadFile");
            $downloadFile.attr("href", url);
            $downloadFile[0].click();
        });
    }

    function changeSnapshotSize(data, ratioOption, ratioOption2){
        var $snapshotWrapper =  $('.snapshot-wrapper');
        var $this = $('#krpanoSWFObject');
        var screenWidth = $this.width() - 80;
        var screenHeight = $this.height() - 50;
        if($snapshotWrapper.height() > $snapshotWrapper.width()){
            var height = (data.width * ratioOption2) / ratioOption;
            if (data.width < 280) return;
            if (height <= screenHeight) $snapshotWrapper.css({width: data.width, height: height});
        } else{
            if (data.height < 280) return;
            var width = (data.height * ratioOption) / ratioOption2;
            if (width <= screenWidth) $snapshotWrapper.css({width: width, height: data.height});
        }
        getSnapshotAreaResolution();
    }

    function changeSliderMinMaxValue($snapshotWrapper, snapshotWrapperMinWidth, snapshotWrapperMinHeight, ratioOption, ratioOption2){
        var minVal, maxVal, width, height;
        var $this = $('#krpanoSWFObject');
        var screenWidth = $this.width() - 80;
        var screenHeight = $this.height() - 32;
        if ($snapshotWrapper.width() > screenWidth){
            $snapshotWrapper.width(screenWidth);
            height = (ratioOption2 * $snapshotWrapper.width())/ratioOption;
            $snapshotWrapper.height(height);
        }
        if ($snapshotWrapper.height() > screenHeight){
            $snapshotWrapper.height(screenHeight);
            width = (ratioOption * $snapshotWrapper.height())/ratioOption2;
            $snapshotWrapper.width(width);
        }
        if($snapshotWrapper.width() > $snapshotWrapper.height()){
            minVal = snapshotWrapperMinWidth;
            maxVal = screenWidth;
        } else if($snapshotWrapper.height() > $snapshotWrapper.width()){
            minVal = snapshotWrapperMinHeight;
            maxVal = screenHeight;
        } else{
            minVal = snapshotWrapperMinWidth;
            maxVal = screenWidth >= screenHeight ? screenHeight : screenWidth;
        }
        return {minVal: minVal, maxVal: maxVal}
    }

    function tooltipsToggle(action){
        $('[data-toggle="tooltip"]').tooltip(action);
    }


    function initFloorplan(floorplanTab, plugin, detectedEvent){
        floorplanTab.find(".floor-plane-hotspot.them-color").on(detectedEvent, function(e) {
            var fileName= $(this).prop("id").replace("map-dot-", "").replace("-_-", ".");
            plugin.loadThiScene(fileName, null);
        });
    }

    function contactUsCallbackAndHandleResult(detectedEvent, element){
        $("#" + element +" form").find("textarea.mandatory-field, input.mandatory-field").on('input', function() {
            hideRequiredOnInputfield($(this));
        });

        $("#" + element +" button.btn-register").on(detectedEvent, function(e) {
           e.preventDefault();
           var clicked = $(this);
          clicked.button('loading');
           var form=$(this).closest("form");
           var formUrl=form.attr("action");
           formUrl = formUrl.replace("%7BLANG%7D", window.lang.currentLang);
           var postForm=$.post( formUrl, form.serialize() );
           postForm.done(function( data ) {
               form.closest(".registration-section-content").hide("fast");
               var infoBox=$("#" + element +" .registration-section h1.info-box.text-success");
                infoBox.find(".success-title").show("fast");
                infoBox.show("fast");
             }).fail(function( data ) {
                try{
                    var responseJSON = jQuery.parseJSON(data.responseText);
                    if(typeof responseJSON.type !== "undefined" && responseJSON.type !== null && responseJSON.type.length > 0){
                        form.find("input.mandatory-field, textarea.mandatory-field").each(function( index ) {
                          var value=$(this).val();
                          if (value === null ||  value === undefined || value.length === 0){
                            var divWrapper=$(this).closest(".form-group");
                            divWrapper.addClass("has-error");
                            divWrapper.find(".help-block").show("fast");
                          }
                        });
                    }else{
                        var errorDiv=form.find(".subtitle.error");
                        errorDiv.show("fast");
                    }
                }catch (e) {
                    var errorDiv=form.find(".subtitle.error");
                    errorDiv.show("fast");
                }
            }).always(function(data){
                clicked.button('reset');
            });

         });
    }

    function registerCallbackAndHandleResult(detectedEvent){

        $("#register-modal form").find("input.mandatory-field").on('input', function() {
            hideRequiredOnInputfield($(this));
        });

        $("#register-modal form").find("#immo-privacyPolicy input, #immo-revocation input").on('change', function() {
            var divParent=$(this).parent();
            divParent.removeClass("has-error");
            divParent.find("span.content").removeClass("help-block");
        });
        $("#register-modal form").find("select.required").on('change', function() {
            hideRequiredOnInputfield($(this));
        });

        $("#register-modal button.btn-register").on(detectedEvent, function(e) {
           e.preventDefault();
           var clicked = $(this);
           clicked.button('loading');
           var form=$(this).closest("form");
           var postForm=$.post( form.attr("action").replace("%7BCURRENT_LANG%7D", window.lang.currentLang), form.serialize() );
           postForm.done(function( data ) {
               form.closest(".registration-section-content").hide();
               var infoBox=$("#register-modal .registration-section h1.info-box");

               if(data.right !== undefined && data.right !== null && data.right.length > 0){
                infoBox.find(".text-content").html(data.right);
                infoBox.find(".warning-title").show();
                infoBox.removeClass("text-success").addClass("text-info");
               }else{
                infoBox.find(".success-title").show();
               }
               infoBox.show();
             }).fail(function( data ) {
                showRequiredOnInputfield(data);
            }).always(function(data){
                              clicked.button('reset');
            });

         });
    }

    function initModalsReactivateExpiredCallbacks(detectedEvent) {
        $("#reactivate-expired-modal #reactivate-submit").on(detectedEvent, function(e) {
           e.preventDefault();
           var clicked = $(this);
           clicked.button('loading');
           var modal = $(this).closest(".modal");
           var request=$.get( window.jsonData.urls.backendUrls.requestTour );
           request.done(function( data ) {
               modal.find(".registration-section-content").hide();
               modal.find("h3").hide();
               var infoBox=modal.find(".registration-section h1.info-box");
               if(data.right !== undefined && data.right !== null && data.right.length > 0){
                infoBox.find(".text-content").html(data.right);
                infoBox.find(".warning-title").show();
                infoBox.removeClass("text-success").addClass("text-info");
               }else{
                infoBox.find(".success-title").show();
               }
               infoBox.show();
             }).fail(function( data ) {
                  infoBox.find(".text-content").html(data.right);
                  infoBox.find(".warning-title").show();
                  infoBox.removeClass("text-success").addClass("text-info");
            }).always(function(data){
                  clicked.button('reset');
            });

         });
    };

    function hideRequiredOnInputfield(element){
        var divWrapper=element.closest(".form-group");
        divWrapper.removeClass("has-error");
        divWrapper.find(".help-block").hide();
        divWrapper.closest(".registration-section-content").find(".subtitle.error").hide();
    }
    function showRequiredOnInputfield(data){

        var registrationSection=$("#register-modal .registration-section");
        try{
            var responseJSON = jQuery.parseJSON(data.responseText);
            if(typeof responseJSON.privacyPolicy !== "undefined" && responseJSON.privacyPolicy !== null && responseJSON.privacyPolicy){
                var checkBoxLabel=registrationSection.find("#immo-privacyPolicy");
                checkBoxLabel.addClass("has-error");
                checkBoxLabel.find("span.content").addClass("help-block");
            }
            if(typeof responseJSON.revocation !== "undefined" && responseJSON.revocation !== null && responseJSON.revocation){
                var checkBoxLabel=registrationSection.find("#immo-revocation");
                checkBoxLabel.addClass("has-error");
                checkBoxLabel.find("span.content").addClass("help-block");
            }
            if(typeof responseJSON.fields !== "undefined" && responseJSON.fields !== null && responseJSON.fields){
                for (var key in responseJSON.fields) {
                  if (responseJSON.fields.hasOwnProperty(key)) {
                    var errorType=responseJSON.fields[key];
                    var divWrapper=registrationSection.find("#immo-" + key);
                    divWrapper.addClass("has-error");
                    divWrapper.find(".help-block-"+errorType).show();
                  }
                }
            }
        }catch(exx){
            registrationSection.find(".subtitle.error").show();
        }
    }

    function addMandatoryField(){
        var mandatoryMark = '* ',
            regExp = /^[* ]/i;
        $('.mandatory-field').each(function () {
            if($(this).is('option')){
                if(!$(this).text().match(regExp)) $(this).prepend(mandatoryMark);
            } else{
                if(!$(this).attr('placeholder').match(regExp)) $(this).attr('placeholder', mandatoryMark + $(this).attr('placeholder'));
            }
        });
    }

    function loadMainThemColor(color, detectedEvent){
        var themColor = 'rgba('+ color.r +','+ color.g +','+ color.b +','+'0.85)';
        var css = '.owl-item .slider-element .slider-description.locked:before, .hotspot.locked .locked-overlay:before {color: rgb(' + color.r +','+ color.g +','+ color.b + ')}';
        addStyleToHeader(css);
        css = '.avatar-section{background-color: rgb(' + color.r +','+ color.g +','+ color.b + ')}';
        addStyleToHeader(css);
        css = '.menu-wrapper .nav-tabs>li.active>a{box-shadow: 0 2px 0 rgb(' + color.r +','+ color.g +','+ color.b + ') !important;}';
        addStyleToHeader(css);
        css = '.menu-wrapper .info-page .info-description-wrapper .header-text{border-bottom: 2px solid rgb(' + color.r +','+ color.g +','+ color.b + ') !important;}';
        addStyleToHeader(css);
        $('.them-color-border').css('border-color', themColor);
        $('.them-color-text').css('color', themColor);
        $('.them-color').css('background-color', themColor);

        $('#control-panel-right .panel-button').on(detectedEvent, function () {
            $('#control-panel-right .panel-button').each(function () {
                if($(this).hasClass('active-button')){
                    $(this).children('i').css('color', themColor);
                }else{
                    $(this).children('i').css('color', '#fff');
                }
            });
        });
    }

    function addStyleToHeader(style){
        var styleWrapper="<style>" + style + "</style>";
            $('head').append(styleWrapper);
    }

    function galleryInitialization(plugin, detectedEvent){
        var $owlCarousel = $('.owl-carousel');
        var id;
        var success=true;
        $owlCarousel.each(function(){
            id = $(this).attr('id');
            try{
                $('#' + id).owlCarousel({
                    items: 5,
                    nav: true,
                    loop: false,
                    navText: ['<i class="fa fa-chevron-left fa-2x"></i>','<i class="fa fa-chevron-right fa-2x"></i>'],
                    margin:20,
                    responsive:{
                        0:{
                           items: 1
                        },

                        310:{
                           items: 2
                        },

                        500:{
                           items: 3
                        },

                        768:{
                           items: 4
                        },

                        992:{
                           items: 5
                        }
                    },
                    URLhashListener:true,
                    startPosition: 'URLHash'
                });
            }catch(exx){
                console.log("error=" + exx.stack, exx);
                success=false;
            }
        });

        var popOverWrapper=$("#popOverWrapper");
        popOverWrapper.on(detectedEvent, '.popover-title .close', function () {
            plugin.hideselection();
        });
        popOverWrapper.on(detectedEvent, '.popover-content .hotspots', function () {
            plugin.hotspotMode=true;
            $(document).bind('keydown', plugin.addESCListener);
            plugin.showhotspotblockoverlay();
            showGallery();

        });

        $("#infopoints-modal .btn-infopoint-submit").on(detectedEvent, function (e) {
            e.preventDefault();
            console.log("Submit hotspot!");
            handleUploadedInfopointAndReturnUrl($(this).closest("form"), $(this), plugin)
        });
        popOverWrapper.on(detectedEvent, '.popover-content .infopoints', function () {
            $("#infopoints-modal").modal("show");
        });
        return success;
    }

    function setGalleryActiveItem(fileName){
        var themColor = 'rgba('+ jsonData.styles.mainColor.r +','+ jsonData.styles.mainColor.g +','+ jsonData.styles.mainColor.b +','+'0.85)';
        themColor = !colorRgb ? themColor : colorRgb;
        $('.slider-element').each(function () {
            if($(this).attr('data-fileName') === fileName){
                $(this).addClass('active-element');
                $(this).css('borderColor', themColor);
            } else{
                $(this).removeClass('active-element');
                $(this).css('borderColor', 'transparent');
            }
        });
    }

    function appendTemplate(that, renderedElement){
        $(renderedElement).appendTo(that);
    }

    function createContentWrapper(krpanoObject){
        $('<div class="krpano-content"></div>').appendTo($(krpanoObject));
    }

    function showActivePage(activePageId, slideDirection){
        var $this;
        $('.menu-wrapper .menu-page').each(function (i) {
            $this = $(this);
            (function($this){
                if ($this.hasClass(activePageId)){
                    if(!slideDirection){
                        $this.removeClass('hidden').addClass('page-active transition-none');
                        setTimeout(function () {
                            $this.removeClass('transition-none');
                        },600);
                    }
                    else if(slideDirection === 'left'){
                        $this.removeClass('hidden');
                        setTimeout(function () {
                            $this.addClass('page-active overlay');
                        },200);
                    }
                    else if(slideDirection === 'right'){
                        $this.addClass('right-direction hidden').removeClass('hidden');
                        setTimeout(function () {
                            $this.removeClass('right-direction').addClass('overlay page-active');
                        },220);
                    }
                    setTimeout(function () {$this.removeClass('overlay');},600);
                } else{
                    if(!slideDirection){
                        $this.addClass('hidden').removeClass('page-active overlay');
                    }
                    else if(slideDirection === 'left'){
                        $this.addClass('right-direction').removeClass('hidden');
                        setTimeout(function () {
                            $this.removeClass('page-active overlay').addClass('opacity-faded');
                        },200);
                    }
                    else if(slideDirection === 'right'){
                        setTimeout(function () {
                            $this.removeClass('page-active overlay').addClass('opacity-faded');
                        },200);
                    }
                    setTimeout(function () {$this.addClass('hidden').removeClass('opacity-faded right-direction');},600);
                }
            })($this);
        });
    }

    function toggleMenu(activePageId, elementId, plugin) {
        var $elementId = $('#' + elementId);
        var $menuWrapper = $('.menu-wrapper');
        var activePrevIconNumber = null, activeCurrentIconNumber = null, slideDirection = null;

        if(!$elementId.hasClass('active-button')){
            hideGallery(plugin);
            $('.panel-button.right-control').each(function (i) {
                if ($(this).hasClass('active-button')){
                    activePrevIconNumber = i;
                    $(this).removeClass('active-button');
                }
                if($(this).attr('id') === elementId){
                    activeCurrentIconNumber = i;
                }
            });
            if(activePrevIconNumber === null) {
                slideDirection = null;
            } else if(activeCurrentIconNumber > activePrevIconNumber ){
                slideDirection = 'right';
            } else if(activeCurrentIconNumber < activePrevIconNumber) {
                slideDirection = 'left';
            }
            $elementId.addClass('active-button');
            $menuWrapper.addClass('menu-open');
            showActivePage(activePageId, slideDirection);
        } else{
            $menuWrapper.removeClass('menu-open');
            $elementId.removeClass('active-button');
        }

        toggleControlPanelColor('#collapse-control');
        hideSettingsPanel();
        //hideLeftEditor();
    }

    function hideLeftEditor(){
        $(".demo").removeClass("activate").addClass("hidden");
        $("#demo-setting").addClass("left-0");
    }

    function hideMenu() {
        $('.menu-wrapper').removeClass('menu-open');
        $('.buttons-wrapper li').removeClass('active-button');
        $('#control-panel-right .panel-button').each(function () {
            $(this).children('i').css('color', '#fff');
        });
        toggleControlPanelColor('#collapse-control');
    }

    function toggleGallery(plugin, isMobileOrTablet){
        hideMenu();
        $('.slider-gallery-section').toggleClass('show-gallery');
        $('.arrow-up').toggleClass('hidden');
        $('.arrow-down').toggleClass('hidden');
        if(!$('.slider-gallery-section').hasClass("show-gallery")){
            plugin.hidehotspotblockoverlay();
        }
        if(isMobileOrTablet){
            hideSettingsPanel();
            hideControlPanel();
        }
    }

    function showGallery(){
        $('.slider-gallery-section').addClass('show-gallery');
        $('.arrow-up').addClass('hidden');
        $('.arrow-down').removeClass('hidden');
    }

    function hideGallery(plugin){
        $('.slider-gallery-section').removeClass('show-gallery');
        $('.arrow-up').removeClass('hidden');
        $('.arrow-down').addClass('hidden');
        plugin.hidehotspotblockoverlay();
    }

    function hideControlPanel(){
        $('#collapse-control').toggleClass('collapsed');
        $('.control-panel.right').removeClass('control-nav-active');
        $('.menu-right-bar').removeClass('control-nav-active');
        $('.menu-wrapper').removeClass('control-nav-active');

        toggleControlPanelColor('#collapse-control');
    }

    function toggleControlPanel(elementId){
        var $element = $('#' + elementId);
        $element.toggleClass('collapsed');
        $('.control-panel.right').toggleClass('control-nav-active');
        $('.menu-right-bar').toggleClass('control-nav-active');
        $('.menu-wrapper').toggleClass('control-nav-active');

        if(!$('.control-panel.right').hasClass('control-nav-active')){
            hideMenu();
        }
        toggleControlPanelColor('#collapse-control');
    }

    function toggleSettingsPanel(elementId){
        var $element = $('#' + elementId);
        $element.toggleClass('collapsed');

        $('.control-panel.left').toggleClass('settings-nav-active');
        $('.menu-left-bar').toggleClass('settings-nav-active');
        $('.menu-wrapper').toggleClass('settings-nav-active');
        hideMenu();
        toggleControlPanelColor('#collapse-setting');
    }

    function hideSettingsPanel(){
        $('#collapse-setting').removeClass('collapsed');
        $('.control-panel.left').removeClass('settings-nav-active');
        $('.menu-left-bar').removeClass('settings-nav-active');
        $('.menu-wrapper').removeClass('settings-nav-active');
        toggleControlPanelColor('#collapse-setting');
    }

    function toggleControlPanelColor(element){
        var themColor = 'rgba('+ jsonData.styles.mainColor.r +','+ jsonData.styles.mainColor.g +','+ jsonData.styles.mainColor.b +','+'0.85)';
        $(element).hasClass('collapsed') && !$('.menu-wrapper').hasClass('menu-open') ? $(element + '.collapsed i').css('color', themColor) : $(element + ' i').css('color', '#fff');
    }

    function collapseMenu(){
        $('.control-panel.right').removeClass('control-nav-active');
        $('.menu-right-bar').removeClass('control-nav-active');
        $('.menu-wrapper').removeClass('control-nav-active');
        $('#collapse-control').removeClass('collapsed');
    }

    function initTabs(krpanoObject){
        krpanoObject.find('.nav.nav-tabs > li').on('touchstart', function (e) {$(this).find("a").tab('show') });
    }

    function initShareCallbacks(krpanoEmbeded, detectedEvent){
        krpanoEmbeded.find('.share-page li.share.face a').on( detectedEvent , function(e) {
            e.preventDefault();
            window.open($(this).attr('href'), 'fbShareWindow', 'height=450, width=550, top=' + ($(window).height() / 2 - 275) + ', left=' + ($(window).width() / 2 - 225) + ', toolbar=0, location=0, menubar=0, directories=0, scrollbars=0');
            return false;
       });
       krpanoEmbeded.find('#facebook-room-share .btn-publish').on( detectedEvent , function(e) {
           e.preventDefault();
           var actualRoomFilename=krpanoEmbeded.find("#actualPano").val().replace("-_-", ".");
           var actualRoom = window.jsonData.tour.rooms[actualRoomFilename];
           var actualRoomUrl = actualRoom.urlMobile;
           var button = $(this);
            FB.getLoginStatus(function(response) {
                if (response.status === 'connected') {
                    fb_api_call(actualRoomUrl, button);
                } else{
                    fb_login(actualRoomUrl, button);
                }
            });
            return false;
      });
       krpanoEmbeded.find('.share-page li.share.faceSingle a').on( detectedEvent , function(e) {
           e.preventDefault();
           var modal=krpanoEmbeded.find("#facebook-room-share");
          var actualRoomFilename=krpanoEmbeded.find("#actualPano").val().replace("-_-", ".");
          var actualRoom = window.jsonData.tour.rooms[actualRoomFilename];
           var textarea=modal.find("textarea");
           var text=textarea.parent().find("#textArea_hidden_wrapper").text();
           text = text.replace("{0}", '"' +actualRoom.name + '"').replace("{1}", '"' +window.jsonData.tour.name+ '"').replace("{2}", window.jsonData.urls.currentUrl);
           krpanoEmbeded.find("#textArea_hidden_wrapper_description").text(text);
           modal.find(".subtitle.error").hide();
           modal.find(".info-box.text-center.text-success").hide();
           modal.find(".info-box.text-center.text-success span").hide();
           modal.find(".registration-section-content").show();
           modal.find(".btn-publish-sending").hide();
           modal.find(".btn-publish").show();
           console.log("open modal");
           modal.modal('show');
           return false;
      });
    }

    function fb_login(selectedRoomUrl, button){
        FB.login(function(response) {
            if (response.authResponse) {
                fb_api_call(selectedRoomUrl, button);
            } else {
             console.log('User cancelled login or did not fully authorize.');
            }
        }, {scope: 'publish_actions'});
    }
    function fb_api_call(selectedRoomUrl, button){
        var modal=$("#facebook-room-share");
        button.hide();
        modal.find(".btn-publish-sending").show();

        FB.api("/me/photos", "POST",
         {
            "url": selectedRoomUrl,
            "allow_spherical_photo": true,
            "caption": modal.find("textarea").val()
        },
        function (response) {
          if (!(response && !response.error)) {
            console.log("error", response);
            modal.find(".subtitle.error").show();
          }else{
           modal.find(".info-box.text-center.text-success").show();
           modal.find(".info-box.text-center.text-success span").show();
           modal.find(".registration-section-content").hide();
           setTimeout(function () {modal.modal('hide');}, 3000);
          }
          modal.find(".btn-publish-sending").hide();
          button.show();
        });
    }

    function chooseFallbackLanguage(potentialLang){
        console.log("call fallback with " + potentialLang);
        var prefix = (potentialLang.indexOf("_") != -1) ? potentialLang.split("_")[0] : potentialLang;
        for (var option in lang._dynamic){
            if (option === potentialLang || (option.indexOf("_") != -1 && option.split("_")[0] === prefix)){
                return option;
            }
        }
        return "en_us";
    }

    function initLanguageSwitcherChooseFallack(potentialLang){
        var prefix = (potentialLang.indexOf("_") != -1) ? potentialLang.split("_")[0] : potentialLang;
        for (var option in lang._dynamic){
            if (option === potentialLang || (option.indexOf("_") != -1 && option.split("_")[0] === prefix)){
                return option;
            }
        }
        return "en_us";
    };

    function languageSwitcherInteractions(plugin){
        var $languageSwitcher = plugin.krpanoEmbeded.find(".language-switcher"), $state;
        var activeFlag = Cookies.get('activeFlag');
        var defaultLanguage = window.jsonData.lang.toLowerCase();
        function formatState (state) {
            $state = $('<span><img src="'+window.baseUrl+'/krpano-common/img/blank.gif" class="flag flag-' + state.text.toLowerCase() + '"/><span class="hidden-xs"> ' + state.text + '</span></span>');
            return $state;
        }
        $languageSwitcher.select2({
            minimumResultsForSearch: Infinity,
            templateResult: formatState,
            templateSelection: formatState,
            theme: "language-switcher"
        });
        // fix for jquery "en" default
        //if (defaultLanguage === "en") defaultLanguage = "en_us";
        try{
            if(!activeFlag || typeof activeFlag === "undefined"){
                $languageSwitcher.val(defaultLanguage).trigger("change");
                //window.lang.change(defaultLanguage);
            } else{
                $languageSwitcher.val(activeFlag).trigger("change");
                //window.lang.change(activeFlag);
            }
        }catch(exx){
            defaultLanguage = initLanguageSwitcherChooseFallack(defaultLanguage);
            $languageSwitcher.val(defaultLanguage).trigger("change");
            //window.lang.change(defaultLanguage);
        }
        $languageSwitcher.on("select2:select", function (e) {
            var selectedId =  e.params.data.id;
            if(activeFlag !== selectedId){
                activeFlag = selectedId;
               // Cookies.set('activeFlag', selectedId)
            }
            !activeFlag || typeof activeFlag === "undefined" ? activeFlag=defaultLanguage : activeFlag = activeFlag;
            try{
                window.lang.change(activeFlag);
                plugin.krpanoEmbeded.find("#telephone, #telephone-contact").intlTelInput("setCountry", activeFlag.substr(3));
                setTimeout(function () {
                    $('.header-title').text($('.menu-page.page-active').attr('data-page-title'));
                },0);
            }catch(exx){
                window.lang.change("en_us");
                setTimeout(function () {
                    $('.header-title').text($('.menu-page.page-active').attr('data-page-title'));
                },0)
                plugin.krpanoEmbeded.find("#telephone, #telephone-contact").intlTelInput("setCountry", "en_us".substr(3));
            }
        });
    }

    function hideElement(element){
        $(element).addClass('hidden')
    }

    function initPopupSelect(elemment, them){
        var selectElement = $(elemment);

        selectElement.select2({
            minimumResultsForSearch: Infinity,
            theme: them
        });
    }

    function zoomPluginInitialization(detectedEvent){
        var $panZoom = $(".panzoom-elements");
        var maxWidth, width, maxHeight, display;

        $panZoom.panzoom({
            increment: 0.1,
            minScale: 0.5,
            maxScale: 5,
            $zoomIn: $('.zoom-btn.in'),
            $zoomOut: $('.zoom-btn.out'),
            $reset: $('.nav-tabs').find('li')
        });

        $panZoom.panzoom().on('mousewheel', function( e ) {
            e.preventDefault();
            var delta = e.delta || e.originalEvent.wheelDelta;
            var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0;
            $panZoom.panzoom('zoom', zoomOut, {
                increment: 0.1,
                animate: false,
                focal: e
            });
            e.stopPropagation();
        });
        $('#floor-plan-btn, .floor-plane-tab').on(detectedEvent, function () {
            setTimeout(function () {
                var $this =  $('.zoom-scope-wrapper .tab-pane.active .floor-plane-image-wrapper');
                maxWidth =  $this.children('img').prop('naturalWidth');
                maxHeight = $('.zoom-section').height() > 600 ? $('.zoom-section').height() : 'none';
                display = $this.children('img').height() > 600 ? 'flex' : 'block';
                $this.css({"max-width": maxWidth, "maxHeight": maxHeight, "display": display});

                if($this.children('img').height() >= $('.zoom-section').height()){
                    $this.children('img').css('height', $('.zoom-section').height());
                    width = $this.children('img').width();
                    $this.css({"width": width});
                }
            },0);
        });
    }

    function mapPluginInitialization(location, address, detectedEvent){
        if(location && location.center && location.center.latitude && location.center.longitude){
        L.Icon.Default.imagePath = window.baseUrl + "/krpano-common/js/images/";
            var latitude = location.center.latitude;
            var longitude = location.center.longitude;
            var mymap = L.map("map-section").setView([latitude, longitude], 15);
            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                minZoom: 10,
                maxZoom: 18,
                center: [latitude, longitude]
            }).addTo(mymap);
            L.marker([latitude, longitude]).addTo(mymap).bindPopup(address);

            if(location.accuracy === "APPROXIMATE" ){
                var distance = getDistance(location.ne, location.center);
                if(distance > 0){
                    var circle=L.circle([latitude, longitude], {radius: distance});
                    circle.addTo(mymap);
                    mymap.fitBounds(circle.getBounds());
                }
            }

            $('body').on(detectedEvent, '#map-btn', function () {
                setTimeout(function () {
                    mymap.invalidateSize();
                },400);
            });
        }
    }

    function getDistance(ne, center) {
        var mapBoundNorthEast = L.latLng(ne.latitude, ne.longitude);
        var mapDistance = mapBoundNorthEast.distanceTo(L.latLng(center.latitude, center.longitude));
        return mapDistance;
    }
}