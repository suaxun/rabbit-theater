import { generateRaw } from "/script.js"; 

jQuery(async () => {
    // ==========================================
    // 0. 数据存储管理 (使用 LocalStorage)
    // ==========================================
    const STORAGE_KEY = 'tutu_theater_scenarios';
    let tutuScenarios = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (tutuScenarios.length === 0) {
        tutuScenarios = [
            { name: "🍳 厨房大乱斗", prompt: "角色正在厨房里手忙脚乱地准备晚餐，结果把盐当成了糖..." }
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
    }

    // 存放从 ST 原生 Prompt Manager 抓取过来的预设
    let nativePrompts = [];

    // ==========================================
    // 1. 构建 HTML 元素
    // ==========================================
    
    // 魔法棒扩展菜单按钮
    const menuButtonHtml = `
        <div id="option_tutu_theater" class="list-group-item flex-container flexGap5 interactable" title="生成与当前角色相关的外置小剧场" tabindex="0" role="listitem">
            <div class="fa-fw fa-solid fa-carrot extensionsMenuExtensionButton"></div>
            <span>兔兔小剧场</span>
        </div>
    `;

    // 居中面板 (新增了导入区域)
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
                    
                    <!-- 【新增】从原生 Prompt Manager 导入功能 -->
                    <div style="display:flex; gap:5px; align-items:center; margin-bottom: 10px; border-bottom: 1px dashed var(--SmartThemeBorderColor); padding-bottom: 10px;">
                        <select id="tutu_import_select" class="text_pole" style="flex:1; margin:0;">
                            <option value="">-- 从原生预设导入 --</option>
                        </select>
                        <div id="tutu_import_btn" class="menu_button margin0" title="抓取并导入到小剧场">
                            <i class="fa-solid fa-file-import"></i> 导入
                        </div>
                    </div>

                    <!-- 剧本列表容器 -->
                    <div id="tutu_library_list" style="display:flex; flex-direction:column; gap:5px; max-height:130px; overflow-y:auto; margin-bottom:10px;">
                        <!-- JS 动态生成 -->
                    </div>
                    
                    <!-- 手动保存控制栏 -->
                    <div style="display:flex; gap:5px; align-items:center;">
                        <input type="text" id="tutu_new_name" class="text_pole" placeholder="给当前情境起个名字..." style="flex:1; margin:0;">
                        <div id="tutu_save_btn" class="menu_button margin0" title="保存到剧本库">
                            <i class="fa-solid fa-save"></i> 保存
                        </div>
                    </div>
                </div>
            </div>

            <!-- 输入区域 -->
            <textarea id="tutu_prompt" class="text_pole textarea_compact" rows="4" placeholder="输入情境，或者从上方剧本库点击加载..." style="width: 100%; box-sizing: border-box;"></textarea>
            
            <!-- 执行按钮 -->
            <div id="tutu_generate_btn" class="menu_button" style="text-align: center; justify-content: center; padding: 10px;">
                <i class="fa-solid fa-wand-magic-sparkles"></i> 导演！Action！
            </div>
            
            <!-- 结果显示区域 -->
            <div id="tutu_result_box" class="text_muted" style="min-height: 150px; max-height: 300px; overflow-y: auto; background: rgba(0, 0, 0, 0.2); border-radius: 5px; padding: 10px; white-space: pre-wrap; font-size: 0.95em; user-select: text;">这里将显示生成的小剧场内容...</div>
        </div>
    `;

    $('body').append(panelHtml);

    // ==========================================
    // 2. 核心功能函数
    // ==========================================
    
    // 渲染我们自己的剧本库
    function renderTutuLibrary() {
        const $list = $('#tutu_library_list');
        $list.empty();
        
        tutuScenarios.forEach((item, index) => {
            // 原生 UI 样式 completion_prompt_manager_prompt
            const $item = $(`
                <div class="completion_prompt_manager_prompt flex-container alignitemscenter justifySpaceBetween" style="cursor:pointer; padding: 8px;" title="点击加载: ${item.prompt.substring(0, 20)}...">
                    <span class="tutu-item-name" style="flex:1; font-weight: bold;">${item.name}</span>
                    <i class="fa-solid fa-trash-can tutu-item-delete hoverglow" style="padding: 5px; color: #ff6666;" title="删除"></i>
                </div>
            `);

            $item.find('.tutu-item-name').on('click', function() {
                $('#tutu_prompt').val(item.prompt);
                toastr.info(`已加载剧本: ${item.name}`, "兔兔小剧场");
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

    // 抓取 ST 系统自带的 Prompt Manager 预设
    function fetchNativePrompts() {
        $.ajax({
            url: '/api/settings/get',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({}),
            success: function(data) {
                if(data && data.settings) {
                    const settings = JSON.parse(data.settings);
                    // 找到 OAI 提示词管理器的数组
                    nativePrompts = settings?.oai_settings?.prompt_manager || [];
                    
                    const $select = $('#tutu_import_select');
                    $select.empty().append('<option value="">-- 从原生预设导入 --</option>');
                    
                    // 将名字填充到下拉菜单中
                    nativePrompts.forEach((p, index) => {
                        if(p.name && p.prompt) {
                            $select.append(`<option value="${index}">${p.name}</option>`);
                        }
                    });
                }
            }
        });
    }

    renderTutuLibrary();

    // ==========================================
    // 3. 注入与交互事件
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

    // 打开面板时，同时去抓取一下原生的预设列表
    $(document).on('click', '#option_tutu_theater', function() {
        const extensionsMenu = document.getElementById('extensionsMenu');
        if(extensionsMenu) extensionsMenu.style.display = 'none';
        
        fetchNativePrompts(); // 每次打开都抓取一次最新数据
        $('#tutu_theater_panel').fadeIn(200).css('display', 'flex'); 
    });

    $('#tutu_close').on('click', function() {
        $('#tutu_theater_panel').fadeOut(200);
    });

    // ---【核心点】从原生下拉菜单导入到兔兔小剧场 ---
    $('#tutu_import_btn').on('click', function() {
        const selectedIndex = $('#tutu_import_select').val();
        if (selectedIndex === "") {
            toastr.warning("请先在下拉菜单中选择一个要导入的原生预设！");
            return;
        }

        const selectedPrompt = nativePrompts[selectedIndex];
        if (selectedPrompt) {
            // 存入兔兔小剧场库
            tutuScenarios.push({
                name: selectedPrompt.name,
                prompt: selectedPrompt.prompt
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
            
            renderTutuLibrary(); // 刷新列表
            toastr.success(`已成功从原生管理器导入: [${selectedPrompt.name}]`);
        }
    });

    // 手动保存
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

    // 生成
    $('#tutu_generate_btn').on('click', async function() {
        const userScenario = $('#tutu_prompt').val().trim();
        if (!userScenario) {
            toastr.warning("请先输入剧场情境！"); 
            return;
        }

        $('#tutu_result_box').text("🐰 兔兔正在疯狂码字中...");
        $('#tutu_generate_btn').addClass('disabled');

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
            console.error(error);
            $('#tutu_result_box').text("❌ 生成失败，请检查 API 连接。");
        } finally {
            $('#tutu_generate_btn').removeClass('disabled'); 
        }
    });
});
