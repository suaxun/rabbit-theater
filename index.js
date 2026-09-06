import { generateRaw } from "/script.js"; 

jQuery(async () => {
    // ==========================================
    // 1. 构建要注入的 HTML 元素 
    // ==========================================
    
    // 魔法棒扩展菜单按钮
    const menuButtonHtml = `
        <div id="option_tutu_theater" class="list-group-item flex-container flexGap5 interactable" title="生成与当前角色相关的外置小剧场" tabindex="0" role="listitem">
            <div class="fa-fw fa-solid fa-carrot extensionsMenuExtensionButton"></div>
            <span>兔兔小剧场</span>
        </div>
    `;

    // 居中面板 (注意这里加上了 position: fixed, top: 50%, left: 50%, transform: translate(-50%, -50%))
    const panelHtml = `
        <div id="tutu_theater_panel" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 450px; background-color: var(--SmartThemeBlurTintColor); backdrop-filter: blur(var(--SmartThemeBlurStrength)); border: 1px solid var(--SmartThemeBorderColor); border-radius: 10px; padding: 20px; z-index: 99999; box-shadow: 0 10px 40px rgba(0,0,0,0.8); color: var(--SmartThemeBodyColor); flex-direction: column; gap: 15px;">
            <div class="tutu-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--SmartThemeBorderColor); padding-bottom: 10px;">
                <h3 style="margin: 0; font-size: 1.3em;">🐰 兔兔小剧场</h3>
                <div id="tutu_close" class="fa-solid fa-xmark interactable" title="关闭" style="font-size: 1.5em; cursor: pointer;"></div>
            </div>
            
            <textarea id="tutu_prompt" class="text_pole textarea_compact" rows="4" placeholder="输入情境，例如：角色正在厨房做饭..." style="width: 100%; box-sizing: border-box;"></textarea>
            
            <div id="tutu_generate_btn" class="menu_button" style="text-align: center; justify-content: center; padding: 10px;">
                <i class="fa-solid fa-wand-magic-sparkles"></i> 导演！Action！
            </div>
            
            <div id="tutu_result_box" class="text_muted" style="min-height: 150px; max-height: 300px; overflow-y: auto; background: rgba(0, 0, 0, 0.2); border-radius: 5px; padding: 10px; white-space: pre-wrap; font-size: 0.95em; user-select: text;">这里将显示生成的小剧场内容...</div>
        </div>
    `;

    // 将面板加到整个 body 中
    $('body').append(panelHtml);

    // ==========================================
    // 2. 注入逻辑 (Injection)
    // ==========================================
    function injectTutuButton() {
        if ($('#option_tutu_theater').length > 0) return;

        const $extensionsMenu = $('#extensionsMenu');
        if ($extensionsMenu.length > 0) {
            $extensionsMenu.append(menuButtonHtml);
        } else if ($('#manageAttachments').length > 0) {
            $('#manageAttachments').after(menuButtonHtml);
        }
    }

    injectTutuButton();

    $(document).on('click', function() {
        injectTutuButton();
    });

    // ==========================================
    // 3. 绑定交互事件 
    // ==========================================
    
    // 点击菜单里的“兔兔小剧场”时
    $(document).on('click', '#option_tutu_theater', function() {
        // 隐藏魔法棒菜单
        const extensionsMenu = document.getElementById('extensionsMenu');
        if(extensionsMenu) {
             extensionsMenu.style.display = 'none';
        }
        
        // 呼出居中面板 (注意这里用 flex 来保持面板内部布局不乱)
        $('#tutu_theater_panel').fadeIn(200).css('display', 'flex'); 
    });

    // 点击关闭按钮
    $('#tutu_close').on('click', function() {
        $('#tutu_theater_panel').fadeOut(200);
    });

    // 点击生成按钮
    $('#tutu_generate_btn').on('click', async function() {
        const userScenario = $('#tutu_prompt').val().trim();
        if (!userScenario) {
            toastr.warning("请先输入剧场情境！"); 
            return;
        }

        $('#tutu_result_box').text("🐰 兔兔正在疯狂码字中...");
        $('#tutu_generate_btn').addClass('disabled'); // 禁用按钮

        try {
            const context = SillyTavern.getContext();
            let charName = "AI";
            if (context.characterId !== undefined && context.characters[context.characterId]) {
                charName = context.characters[context.characterId].name;
            }

            const aiPrompt = `请根据以下情境，写一段关于${charName}的外置小剧场（番外篇）。要求生动有趣，不要包含在正文对话中。\n情境：${userScenario}`;

            const response = await generateRaw({
                prompt: aiPrompt,
                quietToLoud: false, 
                isImpersonate: false
            });

            $('#tutu_result_box').text(response);
            
        } catch (error) {
            console.error("生成小剧场失败:", error);
            $('#tutu_result_box').text("❌ 生成失败，请检查 API 连接。");
        } finally {
            $('#tutu_generate_btn').removeClass('disabled'); 
        }
    });
});
