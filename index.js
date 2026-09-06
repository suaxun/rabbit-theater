import { generateRaw } from "/script.js"; 

jQuery(async () => {
    // ==========================================
    // 0. 数据存储管理 (LocalStorage)
    // ==========================================
    const STORAGE_KEY = 'tutu_theater_scenarios';
    let tutuScenarios = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (tutuScenarios.length === 0) {
        tutuScenarios = [
            { name: "🍳 厨房大乱斗", prompt: "角色正在厨房里手忙脚乱地准备晚餐，结果把盐当成了糖..." }
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
    }

    let scrapedPrompts = []; // 用于存放从页面上抓取到的原生预设

    // ==========================================
    // 1. 注入 CSS 样式
    // ==========================================
    const tutuStyle = `
        <style>
            .tutu-tab-nav { display: flex; border-bottom: 1px solid var(--SmartThemeBorderColor); margin-bottom: 15px; }
            .tutu-tab-btn { flex: 1; text-align: center; padding: 8px; cursor: pointer; opacity: 0.6; transition: 0.2s; font-weight: bold; }
            .tutu-tab-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); }
            .tutu-tab-btn.active { opacity: 1; border-bottom: 3px solid var(--SmartThemeQuoteColor); }
            .tutu-tab-content { display: none; flex-direction: column; gap: 10px; }
            .tutu-tab-content.active { display: flex; }
            
            .tutu-preset-card { border: 1px solid var(--SmartThemeBorderColor); border-radius: 5px; padding: 10px; background: rgba(0,0,0,0.2); }
            .tutu-preset-name { font-weight: bold; color: var(--SmartThemeQuoteColor); font-size: 1.1em; margin-bottom: 5px; }
            .tutu-preset-text { font-size: 0.85em; opacity: 0.8; white-space: pre-wrap; word-break: break-all; max-height: 60px; overflow: hidden; text-overflow: ellipsis; margin-bottom: 10px; }
        </style>
    `;
    $('head').append(tutuStyle);

    // ==========================================
    // 2. 构建面板 HTML
    // ==========================================
    const menuButtonHtml = `
        <div id="option_tutu_theater" class="list-group-item flex-container flexGap5 interactable" title="生成外置小剧场" tabindex="0" role="listitem">
            <div class="fa-fw fa-solid fa-carrot extensionsMenuExtensionButton"></div>
            <span>兔兔小剧场</span>
        </div>
    `;

    const panelHtml = `
        <div id="tutu_theater_panel" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 500px; background-color: var(--SmartThemeBlurTintColor); backdrop-filter: blur(var(--SmartThemeBlurStrength)); border: 1px solid var(--SmartThemeBorderColor); border-radius: 10px; padding: 20px; z-index: 99999; box-shadow: 0 10px 40px rgba(0,0,0,0.8); color: var(--SmartThemeBodyColor); flex-direction: column;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; font-size: 1.3em;">🐰 兔兔小剧场</h3>
                <div id="tutu_close" class="fa-solid fa-xmark interactable hoverglow" title="关闭" style="font-size: 1.5em;"></div>
            </div>
            
            <div class="tutu-tab-nav">
                <div class="tutu-tab-btn active" data-tab="tutu_tab_generate">🎬 生成</div>
                <div class="tutu-tab-btn" data-tab="tutu_tab_library">📚 我的剧本</div>
                <div class="tutu-tab-btn" data-tab="tutu_tab_import">📥 页面提取</div>
            </div>

            <!-- TAB 1: 生成区 -->
            <div id="tutu_tab_generate" class="tutu-tab-content active">
                <textarea id="tutu_prompt" class="text_pole textarea_compact" rows="4" placeholder="输入情境，或者从剧本库加载..." style="width: 100%; box-sizing: border-box;"></textarea>
                <div id="tutu_generate_btn" class="menu_button" style="text-align: center; justify-content: center; padding: 10px;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> 导演！Action！
                </div>
                <div id="tutu_result_box" class="text_muted" style="min-height: 120px; max-height: 250px; overflow-y: auto; background: rgba(0, 0, 0, 0.3); border-radius: 5px; padding: 10px; white-space: pre-wrap; font-size: 0.95em; user-select: text;">这里将显示生成的小剧场内容...</div>
            </div>

            <!-- TAB 2: 我的剧本库 -->
            <div id="tutu_tab_library" class="tutu-tab-content">
                <div style="display:flex; gap:5px; align-items:center; margin-bottom: 10px;">
                    <input type="text" id="tutu_new_name" class="text_pole" placeholder="给当前输入框的情境起个名字..." style="flex:1; margin:0;">
                    <div id="tutu_save_btn" class="menu_button margin0"><i class="fa-solid fa-save"></i> 保存</div>
                </div>
                <div id="tutu_library_list" style="overflow-y:auto; max-height:250px; display:flex; flex-direction:column; gap:8px;"></div>
            </div>

            <!-- TAB 3: 页面预设提取 -->
            <div id="tutu_tab_import" class="tutu-tab-content">
                <div style="margin-bottom: 10px; font-size: 0.9em; opacity: 0.8;">
                    <i class="fa-solid fa-info-circle"></i> 下方列出了当前页面上所有的 Prompt Manager 预设条目。
                </div>
                <div id="tutu_scraped_list" style="overflow-y:auto; max-height:260px; display:flex; flex-direction:column; gap:10px;"></div>
            </div>

        </div>
    `;

    $('body').append(panelHtml);

    // ==========================================
    // 3. 核心逻辑函数
    // ==========================================
    
    // Tab 切换逻辑
    $('.tutu-tab-btn').on('click', function() {
        $('.tutu-tab-btn').removeClass('active');
        $('.tutu-tab-content').removeClass('active');
        $(this).addClass('active');
        $(`#${$(this).data('tab')}`).addClass('active');
    });

    // 渲染：我的剧本库
    function renderLibrary() {
        const $list = $('#tutu_library_list');
        $list.empty();
        
        tutuScenarios.forEach((item, index) => {
            const $item = $(`
                <div class="tutu-preset-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="tutu-preset-name">${item.name}</span>
                        <i class="fa-solid fa-trash-can tutu-item-delete hoverglow" style="color: #ff6666; cursor: pointer;" title="删除"></i>
                    </div>
                    <div class="tutu-preset-text">${item.prompt}</div>
                    <div class="menu_button tutu-load-btn margin0" style="width: 100%; justify-content: center;">
                        <i class="fa-solid fa-play"></i> 载入此剧本
                    </div>
                </div>
            `);

            $item.find('.tutu-load-btn').on('click', function() {
                $('#tutu_prompt').val(item.prompt);
                $('.tutu-tab-btn[data-tab="tutu_tab_generate"]').trigger('click');
                toastr.info(`已载入: ${item.name}`, "兔兔小剧场");
            });

            $item.find('.tutu-item-delete').on('click', function() {
                tutuScenarios.splice(index, 1);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
                renderLibrary();
            });

            $list.append($item);
        });
    }

    // 核心修复：直接从 DOM 抓取 Prompt Manager 列表
    function scrapeAndRenderPromptsFromDOM() {
        scrapedPrompts = [];
        const $list = $('#tutu_scraped_list');
        $list.empty();

        const $promptElements = $('.completion_prompt_manager_prompt.completion_prompt_manager_prompt_draggable');
        
        if ($promptElements.length === 0) {
            $list.html('<div style="text-align:center; padding: 20px; opacity:0.6;">当前页面没有找到任何预设条目，请确保你在 AI 设置中打开了相应的预设列表。</div>');
            return;
        }

        $promptElements.each(function(index) {
            // 【关键修复】：跳过带有 ☰ 的 span，准确拿到名字！
            let name = $(this).find('span').filter(function() {
                return $(this).text().trim() !== '☰' && $(this).text().trim() !== '';
            }).first().text().trim();
            
            if (!name) name = `未命名条目 ${index + 1}`;

            // ST 的数据通常存在 DOM 元素的 jQuery data 里
            const itemData = $(this).data('item') || $(this).data('prompt') || {};
            // 尝试从对象、属性中获取提示词正文
            let promptText = itemData.prompt || itemData.content || itemData.value || $(this).attr('title') || "";
            
            scrapedPrompts.push({ name, prompt: promptText });

            // 渲染到提取列表中
            const $card = $(`
                <div class="tutu-preset-card">
                    <div class="tutu-preset-name">${name}</div>
                    <div class="tutu-preset-text">${promptText || "【未检测到正文内容，导入后可手动补充】"}</div>
                    <div class="menu_button tutu-import-btn margin0" style="width: 100%; justify-content: center;">
                        <i class="fa-solid fa-download"></i> 收录到我的剧本
                    </div>
                </div>
            `);

            $card.find('.tutu-import-btn').on('click', function() {
                tutuScenarios.push({
                    name: name,
                    prompt: promptText
                });
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
                renderLibrary();
                
                toastr.success(`已收录: ${name}`);
                $('.tutu-tab-btn[data-tab="tutu_tab_library"]').trigger('click'); // 跳回剧本库
            });

            $list.append($card);
        });
    }

    // ==========================================
    // 4. 注入与全局事件
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
    $(document).on('click', function() { injectTutuButton(); });

    // 打开面板
    $(document).on('click', '#option_tutu_theater', function() {
        const extensionsMenu = document.getElementById('extensionsMenu');
        if(extensionsMenu) extensionsMenu.style.display = 'none';
        
        renderLibrary();
        scrapeAndRenderPromptsFromDOM(); // 每次打开，重新爬取一次页面上的条目！
        
        $('#tutu_theater_panel').fadeIn(200).css('display', 'flex'); 
    });

    $('#tutu_close').on('click', function() {
        $('#tutu_theater_panel').fadeOut(200);
    });

    $('#tutu_save_btn').on('click', function() {
        const name = $('#tutu_new_name').val().trim();
        const prompt = $('#tutu_prompt').val().trim();
        
        if (!name || !prompt) {
            toastr.warning("名字和输入框内的情境都不能为空！");
            return;
        }

        tutuScenarios.push({ name, prompt });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
        
        $('#tutu_new_name').val(''); 
        renderLibrary();
        toastr.success(`剧本 [${name}] 已保存！`);
    });

    $('#tutu_generate_btn').on('click', async function() {
        const userScenario = $('#tutu_prompt').val().trim();
        if (!userScenario) return toastr.warning("请先输入剧场情境！");

        $('#tutu_result_box').text("🐰 兔兔正在疯狂码字中...");
        $('#tutu_generate_btn').addClass('disabled');

        try {
            const context = SillyTavern.getContext();
            const charName = (context.characterId !== undefined && context.characters[context.characterId]) ? context.characters[context.characterId].name : "AI";
            const aiPrompt = `请根据以下情境，写一段关于${charName}的外置小剧场（番外篇）。要求生动有趣，不要包含在正文对话中。\n情境：${userScenario}`;

            const response = await generateRaw({ prompt: aiPrompt, quietToLoud: false, isImpersonate: false });
            $('#tutu_result_box').text(response);
        } catch (error) {
            console.error(error);
            $('#tutu_result_box').text("❌ 生成失败，请检查 API 连接。");
        } finally {
            $('#tutu_generate_btn').removeClass('disabled'); 
        }
    });
});
