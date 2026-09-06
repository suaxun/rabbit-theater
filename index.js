// 从 ST 的核心代码中导入我们需要的功能
// 注意路径：第三方扩展通常在 public/scripts/extensions/third-party/你的扩展名/
import { generateRaw } from "../../../../script.js"; 
import { getContext } from "../../../../extensions.js";

jQuery(async () => {
    // ==========================================
    // 1. 构建要注入的 HTML 元素
    // ==========================================
    
    // A. 注入到左侧菜单 (#options .options-content) 里的按钮
    const menuButtonHtml = `
        <a id="option_tutu_theater" title="打开兔兔小剧场">
            <i class="fa-lg fa-solid fa-carrot"></i> <!-- 胡萝卜图标 -->
            <span>兔兔小剧场</span>
        </a>
    `;

    // B. 独立浮动面板的 HTML
    const panelHtml = `
        <div id="tutu_theater_panel" style="display: none;">
            <div class="tutu-header">
                <h3>🐰 兔兔小剧场</h3>
                <div id="tutu_close" class="fa-solid fa-xmark interactable" title="关闭"></div>
            </div>
            
            <textarea id="tutu_prompt" class="text_pole textarea_compact" rows="3" placeholder="输入情境，例如：角色正在厨房做饭..."></textarea>
            
            <div id="tutu_generate_btn" class="menu_button">
                <i class="fa-solid fa-wand-magic-sparkles"></i> 导演！Action！
            </div>
            
            <div id="tutu_result_box" class="text_muted">这里将显示生成的小剧场内容...</div>
        </div>
    `;

    // ==========================================
    // 2. 执行注入逻辑 (Injection)
    // ==========================================
    
    // 将按钮加到左侧弹出菜单中 (紧跟在“Start new chat”上方或底部)
    $('#options .options-content').append(menuButtonHtml);
    
    // 将面板加到整个 body 中（悬浮层）
    $('body').append(panelHtml);

    // ==========================================
    // 3. 绑定交互事件
    // ==========================================
    
    // 点击菜单里的“兔兔小剧场”时
    $('#option_tutu_theater').on('click', function() {
        $('#options').hide(); // 隐藏原生菜单
        $('#tutu_theater_panel').fadeIn(200); // 呼出我们的面板
    });

    // 点击关闭按钮
    $('#tutu_close').on('click', function() {
        $('#tutu_theater_panel').fadeOut(200);
    });

    // 点击生成按钮 (调用你发给我的 script.js 里的 generateRaw)
    $('#tutu_generate_btn').on('click', async function() {
        const userScenario = $('#tutu_prompt').val().trim();
        if (!userScenario) {
            toastr.warning("请先输入剧场情境！"); // 调用 ST 原生的提示框
            return;
        }

        $('#tutu_result_box').text("🐰 兔兔正在疯狂码字中...");
        $('#tutu_generate_btn').addClass('disabled'); // 禁用按钮防止连点

        try {
            // 获取当前的聊天上下文信息
            const context = getContext();
            const charName = context.characters[context.characterId]?.name || "AI";

            // 构建发给大模型的系统提示词
            const aiPrompt = `请根据以下情境，写一段关于${charName}的外置小剧场（番外篇）。要求生动有趣。\n情境：${userScenario}`;

            // 调用 script.js 暴露的 generateRaw 方法直接获取大模型回复，不污染当前聊天记录
            const response = await generateRaw({
                prompt: aiPrompt,
                quietToLoud: false, // 后台静默生成
                isImpersonate: false
            });

            // 将生成结果展示在面板中
            $('#tutu_result_box').text(response);
            
        } catch (error) {
            console.error("生成小剧场失败:", error);
            $('#tutu_result_box').text("❌ 生成失败，请检查 API 连接。");
        } finally {
            $('#tutu_generate_btn').removeClass('disabled'); // 恢复按钮
        }
    });
});
