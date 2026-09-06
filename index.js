import { generateRaw } from "/script.js"; 

jQuery(async () => {
    const STORAGE_KEY = 'tutu_theater_scenarios';
    let tutuScenarios = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (tutuScenarios.length === 0) {
        tutuScenarios = [
            { name: "🍳 厨房大乱斗", prompt: "角色正在厨房里手忙脚乱地准备晚餐，结果把盐当成了糖..." }
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
    }

    let nativePrompts = []; // 用于存放从页面抓取的条目

    // 1. 构建 HTML 元素
    const menuButtonHtml = `
        <div id="option_tutu_theater" class="list-group-item flex-container flexGap5 interactable" title="生成与当前角色相关的外置小剧场" tabindex="0" role="listitem">
            <div class="fa-fw fa-solid fa-carrot extensionsMenuExtensionButton"></div>
            <span>兔兔小剧场</span>
        </div>
    `;

    const panelHtml = `
        <div id="tutu_theater_panel" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 450px; background-color: var(--SmartThemeBlurTintColor); backdrop-filter: blur(var(--SmartThemeBlurStrength)); border: 1px solid var(--SmartThemeBorderColor); border-radius: 10px; padding: 20px; z-index: 99999; box-shadow: 0 10px 40px rgba(0,0,0,0.8); color: var(--SmartThemeBodyColor); flex-direction: column; gap: 15px;">
            
            <div class="tutu-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--SmartThemeBorderColor); padding-bottom: 10px;">
                <h3 style="margin: 0; font-size: 1.3em;">🐰 兔兔小剧场</h3>
                <div id="tutu_close" class="fa-solid fa-xmark interactable" title="关闭" style="font-size: 1.5em; cursor: pointer;"></div>
            </div>
            
            <!-- 剧本库折叠面板 -->
            <div class="inline-drawer wide100p flexFlowColumn">
                <div class="inline-drawer-toggle inline-drawer-header interactable">
                    <b><span class="fa-solid fa-book-bookmark"></span> 剧本预设库</b>
                    <div class="fa-solid fa-circle-chevron-down inline-drawer-icon down"></div>
                </div>
                <div class="inline-drawer-content" style="display: none; padding-top: 10px;">
                    
                    <!-- 【DOM抓取导入区域】 -->
                    <div style="display:flex; gap:5px; align-items:center; margin-bottom: 10px; border-bottom: 1px dashed var(--SmartThemeBorderColor); padding-bottom: 10px;">
                        <select id="tutu_import_select" class="text_pole" style="flex:1; margin:0;">
                            <option value="">-- 从页面现有预设提取 --</option>
                        </select>
                        <div id="tutu_import_btn" class="menu_button margin0" title="提取并保存到小剧场">
                            <i class="fa-solid fa-file-import"></i> 导入
                        </div>
                    </div>

                    <!-- 剧本列表 -->
                    <div id="tutu_library_list" style="display:flex; flex-direction:column; gap:5px; max-height:130px; overflow-y:auto; margin-bottom:10px;">
                    </div>
                    
                    <!-- 手动保存 -->
                    <div style="display:flex; gap:5px; align-items:center;">
                        <input type="text" id="tutu_new_name" class="text_pole" placeholder="给当前情境起个名字..." style="flex:1; margin:0;">
                        <div id="tutu_save_btn" class="menu_button margin0">
                            <i class="fa-solid fa-save"></i> 保存
                        </div>
                    </div>
                </div>
            </div>

            <textarea id="tutu_prompt" class="text_pole textarea_compact" rows="4" placeholder="输入情境，或者从上方剧本库点击加载..." style="width: 100%; box-sizing: border-box;"></textarea>
            
            <div id="tutu_generate_btn" class="menu_button" style="text-align: center; justify-content: center; padding: 10px;">
                <i class="fa-solid fa-wand-magic-sparkles"></i> 导演！Action！
            </div>
            
            <div id="tutu_result_box" class="text_muted" style="min-height: 150px; max-height: 300px; overflow-y: auto; background: rgba(0, 0, 0, 0.2); border-radius: 5px; padding: 10px; white-space: pre-wrap; font-size: 0.95em; user-select: text;">这里将显示生成的小剧场内容...</div>
        </div>
    `;

    $('body').append(panelHtml);

    // ==========================================
    // 2. 核心功能函数
    // ==========================================
    
    function renderTutuLibrary() {
        const $list = $('#tutu_library_list');
        $list.empty();
        
        tutuScenarios.forEach((item, index) => {
            const $item = $(`
                <div class="completion_prompt_manager_prompt flex-container alignitemscenter justifySpaceBetween" style="cursor:pointer; padding: 8px;" title="点击加载">
                    <span class="tutu-item-name" style="flex:1; font-weight: bold;">${item.name}</span>
                    <i class="fa-solid fa-trash-can tutu-item-delete hoverglow" style="padding: 5px; color: #ff6666;" title="删除"></i>
                </div>
            `);

            $item.find('.tutu-item-name').on('click', function() {
                $('#tutu_prompt').val(item.prompt);
                toastr.info(`已加载: ${item.name}`, "兔兔小剧场");
            });

            $item.find('.tutu-item-delete').on('click', function(e) {
                e.stopPropagation();
                tutuScenarios.splice(index, 1);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
                renderTutuLibrary();
            });

            $list.append($item);
        });
    }

    // 【修改点】：直接从你指定的 DOM 类名去抓取数据！
    function fetchPromptsFromDOM() {
        nativePrompts = [];
        const $select = $('#tutu_import_select');
        $select.empty().append('<option value="">-- 从页面现有预设提取 --</option>');

        // 遍历所有带有 completion_prompt_manager_prompt 的元素
        $('.completion_prompt_manager_prompt.completion_prompt_manager_prompt_draggable').each(function(index) {
            
            // ST 的预设名字通常在 span 里
            const name = $(this).find('span').first().text().trim() || `未命名条目 ${index + 1}`;
            
            // 尝试获取提示词内容（ST通常把提示词放在 tooltip/title 属性，或者存在 jQuery data 里）
            let promptText = $(this).attr('title') || $(this).data('prompt') || '';
            
            // 如果没抓到 title，尝试抓取它内部附带的其他文本内容并过滤掉名字
            if (!promptText) {
                promptText = $(this).text().replace(name, '').trim();
            }

            if (promptText) {
                nativePrompts.push({ name, prompt: promptText });
                $select.append(`<option value="${nativePrompts.length - 1}">${name}</option>`);
            }
        });
    }

    renderTutuLibrary();

    // ==========================================
    // 3. 注入与事件绑定
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

    $(document).on('click', '#option_tutu_theater', function() {
        const extensionsMenu = document.getElementById('extensionsMenu');
        if(extensionsMenu) extensionsMenu.style.display = 'none';
        
        // 每次打开面板时，实时去 DOM 里爬取一遍数据！
        fetchPromptsFromDOM(); 
        
        $('#tutu_theater_panel').fadeIn(200).css('display', 'flex'); 
    });

    $('#tutu_close').on('click', function() {
        $('#tutu_theater_panel').fadeOut(200);
    });

    // 导入提取到的 DOM 预设
    $('#tutu_import_btn').on('click', function() {
        const selectedIndex = $('#tutu_import_select').val();
        if (selectedIndex === "") {
            toastr.warning("请先在下拉菜单中选择一个提取到的条目！");
            return;
        }

        const selectedPrompt = nativePrompts[selectedIndex];
        if (selectedPrompt) {
            tutuScenarios.push({
                name: selectedPrompt.name,
                prompt: selectedPrompt.prompt
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
            renderTutuLibrary();
            toastr.success(`已导入: [${selectedPrompt.name}]`);
        }
    });

    $('#tutu_save_btn').on('click', function() {
        const name = $('#tutu_new_name').val().trim();
        const prompt = $('#tutu_prompt').val().trim();
        if (!name || !prompt) {
            toastr.warning("名字和情境内容都不能为空！");
            return;
        }
        tutuScenarios.push({ name, prompt });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
        $('#tutu_new_name').val(''); 
        renderTutuLibrary();
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
