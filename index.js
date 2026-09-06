import { generateRaw } from "/script.js"; 

jQuery(async () => {
    // ==========================================
    // 1. 构建要注入的 HTML 元素 (完美复刻原生的类名)
    // ==========================================
    
    // A. 注入到魔法棒菜单 (#extensionsMenu) 里的按钮
    const menuButtonHtml = `
        <div id="option_tutu_theater" class="list-group-item flex-container flexGap5 interactable" title="生成与当前角色相关的外置小剧场" tabindex="0" role="listitem">
            <div class="fa-fw fa-solid fa-carrot extensionsMenuExtensionButton"></div>
            <span>兔兔小剧场</span>
        </div>
    `;

    // B. 独立浮动面板的 HTML
    const panelHtml = `
        <div id="tutu_theater_panel" style="display: none; position: absolute; bottom: 70px; left: 10px; width: 350px; background-color: var(--SmartThemeBlurTintColor); backdrop-filter: blur(var(--SmartThemeBlurStrength)); border: 1px solid var(--SmartThemeBorderColor); border-radius: 10px; padding: 15px; z-index: 9999; box-shadow: 0 4px 15px rgba(0,0,0,0.5); color: var(--SmartThemeBodyColor); display: flex; flex-direction: column; gap: 10px;">
            <div class="tutu-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--SmartThemeBorderColor); padding-bottom: 5px;">
                <h3 style="margin: 0; font-size: 1.2em;">🐰 兔兔小剧场</h3>
                <div id="tutu_close" class="fa-solid fa-xmark interactable" title="关闭"></div>
            </div>
            
            <textarea id="tutu_prompt" class="text_pole textarea_compact" rows="3" placeholder="输入情境，例如：角色正在厨房做饭..."></textarea>
            
            <div id="tutu_generate_btn" class="menu_button">
                <i class="fa-solid fa-wand-magic-sparkles"></i> 导演！Action！
            </div>
            
            <div id="tutu_result_box" class="text_muted" style="min-height: 100px; max-height: 250px; overflow-y: auto; background: rgba(0, 0, 0, 0.2); border-radius: 5px; padding: 10px; white-space: pre-wrap; font-size: 0.9em; user-select: text;">这里将显示生成的小剧场内容...</div>
        </div>
    `;

    // 将面板加到整个 body 中（我直接把 CSS 写在行内了，这样你甚至不需要 style.css 也能跑）
    $('body').append(panelHtml);

    // ==========================================
    // 2. 执行注入逻辑 (Injection)
    // ==========================================
    
    // 创建一个注入函数
    function injectTutuButton() {
        // 如果已经注入过了，就跳过
        if ($('#option_tutu_theater').length > 0) return;

        // 尝试找到魔法棒菜单
        const $extensionsMenu = $('#extensionsMenu');
        if ($extensionsMenu.length > 0) {
            $extensionsMenu.append(menuButtonHtml);
        } else if ($('#manageAttachments').length > 0) {
            // 备用方案：如果找不到扩展菜单，但找到了数据库按钮，就插在它后面
            $('#manageAttachments').after(menuButtonHtml);
        }
    }

    // 立即尝试注入一次
    injectTutuButton();

    // 为了防止菜单是动态生成的，我们在每次用户点击界面时检测一下（这在 ST 扩展中很常用）
    $(document).on('click', function() {
        injectTutuButton();
    });

    // ==========================================
    // 3. 绑定交互事件 (使用事件委托绑定，防止按钮被重建)
    // ==========================================
    
    // 点击菜单里的“兔兔小剧场”时
    $(document).on('click', '#option_tutu_theater', function() {
        $('#extensionsMenu').hide(); // 隐藏魔法棒菜单
        $('#tutu_theater_panel').fadeIn(200); // 呼出我们的面板
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
            // 使用 SillyTavern 的上下文
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
            $('#tutu_generate_btn').removeClass('disabled'); // 恢复按钮
        }
    });
});
