import { generateRaw } from "/script.js"; 
import { oai_settings } from "/scripts/openai.js";
import { power_user } from "/scripts/power-user.js"; // 【新增】用于获取主系统提示词

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
            
            .tutu-preset-card { border: 1px solid var(--SmartThemeBorderColor); border-radius: 5px; padding: 10px; background: rgba(0,0,0,0.2); transition: 0.2s; }
            .tutu-preset-card:hover { background: rgba(255,255,255,0.05); }
            .tutu-preset-name { font-weight: bold; color: var(--SmartThemeQuoteColor); font-size: 1.1em; margin-bottom: 5px; }
            .tutu-preset-text { font-size: 0.85em; opacity: 0.8; white-space: pre-wrap; word-break: break-all; max-height: 80px; overflow-y: auto; margin-bottom: 5px; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 5px; }
            
            /* 滚动条美化 */
            .tutu-preset-text::-webkit-scrollbar { width: 5px; }
            .tutu-preset-text::-webkit-scrollbar-thumb { background: var(--SmartThemeQuoteColor); border-radius: 5px; }
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
        <div id="tutu_theater_panel" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 550px; background-color: var(--SmartThemeBlurTintColor); backdrop-filter: blur(var(--SmartThemeBlurStrength)); border: 1px solid var(--SmartThemeBorderColor); border-radius: 10px; padding: 20px; z-index: 99999; box-shadow: 0 10px 40px rgba(0,0,0,0.8); color: var(--SmartThemeBodyColor); flex-direction: column;">
            
            <!-- 头部 -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; font-size: 1.3em;">🐰 兔兔小剧场</h3>
                <div id="tutu_close" class="fa-solid fa-xmark interactable hoverglow" title="关闭" style="font-size: 1.5em; cursor: pointer;"></div>
            </div>
            
            <!-- 标签导航 -->
            <div class="tutu-tab-nav">
                <div class="tutu-tab-btn active" data-tab="tutu_tab_generate">🎬 生成</div>
                <div class="tutu-tab-btn" data-tab="tutu_tab_library">📚 我的剧本</div>
                <div class="tutu-tab-btn" data-tab="tutu_tab_import">📥 批量导入</div>
            </div>

            <!-- TAB 1: 生成区 -->
            <div id="tutu_tab_generate" class="tutu-tab-content active">
                <textarea id="tutu_prompt" class="text_pole textarea_compact" rows="5" placeholder="输入情境，或者从剧本库加载..." style="width: 100%; box-sizing: border-box;"></textarea>
                <div id="tutu_generate_btn" class="menu_button" style="text-align: center; justify-content: center; padding: 10px;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> 导演！Action！
                </div>
                <div id="tutu_result_box" class="text_muted" style="min-height: 150px; max-height: 250px; overflow-y: auto; background: rgba(0, 0, 0, 0.3); border-radius: 5px; padding: 10px; white-space: pre-wrap; font-size: 0.95em; user-select: text;">这里将显示生成的小剧场内容...</div>
            </div>

            <!-- TAB 2: 我的剧本库 -->
            <div id="tutu_tab_library" class="tutu-tab-content">
                <div style="display:flex; gap:5px; align-items:center; margin-bottom: 10px;">
                    <input type="text" id="tutu_new_name" class="text_pole" placeholder="给当前输入框的情境起个名字..." style="flex:1; margin:0;">
                    <div id="tutu_save_btn" class="menu_button margin0"><i class="fa-solid fa-save"></i> 保存新剧本</div>
                </div>
                <div id="tutu_library_list" style="overflow-y:auto; max-height:300px; display:flex; flex-direction:column; gap:8px;">
                    <!-- JS 渲染的剧本库 -->
                </div>
            </div>

            <!-- TAB 3: 多选批量导入系统预设 -->
            <div id="tutu_tab_import" class="tutu-tab-content">
                <div style="margin-bottom: 5px; font-size: 0.9em; opacity: 0.8;">
                    <i class="fa-solid fa-info-circle"></i> 勾选下方你需要的系统预设，一键导入到兔兔小剧场中。
                </div>
                <!-- 全选 & 导入按钮控制栏 -->
                <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 5px; padding-bottom: 10px; border-bottom: 1px dashed var(--SmartThemeBorderColor);">
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <input type="checkbox" id="tutu_select_all" style="width:16px; height:16px; cursor:pointer;">
                        <span style="font-weight:bold;">全选</span>
                    </label>
                    <div id="tutu_import_selected_btn" class="menu_button margin0" style="background-color: var(--SmartThemeQuoteColor); color: #fff;">
                        <i class="fa-solid fa-download"></i> 导入所选项
                    </div>
                </div>
                
                <div id="tutu_native_prompts_list" style="overflow-y:auto; max-height:280px; display:flex; flex-direction:column; gap:10px;">
                    <div style="text-align:center; padding: 20px;">正在读取系统预设...</div>
                </div>
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
                <div class="tutu-preset-card" style="display: flex; gap: 10px; align-items: center;">
                    <div style="flex:1;">
                        <div class="tutu-preset-name">${item.name}</div>
                        <div class="tutu-preset-text">${item.prompt}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <div class="menu_button tutu-load-btn margin0" style="justify-content: center; min-width: 80px;" title="载入">
                            <i class="fa-solid fa-play"></i> 载入
                        </div>
                        <div class="menu_button tutu-item-delete margin0" style="justify-content: center; min-width: 80px; background: rgba(255,0,0,0.2);" title="删除">
                            <i class="fa-solid fa-trash-can"></i> 删除
                        </div>
                    </div>
                </div>
            `);

            // 载入剧本并跳回生成页面
            $item.find('.tutu-load-btn').on('click', function() {
                $('#tutu_prompt').val(item.prompt);
                $('.tutu-tab-btn[data-tab="tutu_tab_generate"]').trigger('click');
                toastr.info(`已载入: ${item.name}`, "兔兔小剧场");
            });

            // 删除
            $item.find('.tutu-item-delete').on('click', function() {
                tutuScenarios.splice(index, 1);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
                renderLibrary();
            });

            $list.append($item);
        });
    }

    // 渲染：带复选框的系统预设列表
    function fetchAndRenderNativePrompts() {
        const $list = $('#tutu_native_prompts_list');
        $list.empty();
        $('#tutu_select_all').prop('checked', false);

        let allPrompts = [];
        
        // ==========================================
        // 抓取来源 1：提示词管理器 (Prompt Manager)
        // 兼容新老版本的命名 (prompts 或 prompt_manager)
        // ==========================================
        if (typeof oai_settings !== 'undefined') {
            let pmArray = [];
            if (Array.isArray(oai_settings.prompts)) {
                pmArray = oai_settings.prompts; // 新版 ST
            } else if (Array.isArray(oai_settings.prompt_manager)) {
                pmArray = oai_settings.prompt_manager; // 老版 ST
            }
            
            pmArray.forEach(p => {
                const promptText = p.content || p.prompt || p.value;
                if (p.name && promptText) {
                    allPrompts.push({
                        name: "[提示词管理器] " + p.name,
                        prompt: promptText
                    });
                }
            });
        }

        // ==========================================
        // 抓取来源 2：当前的系统提示词预设 (System Prompt)
        // 包含主提示词 (Main Prompt) 和历史后指令 (NSFW/Jailbreak)
        // ==========================================
        if (typeof power_user !== 'undefined' && power_user.sysprompt) {
            if (power_user.sysprompt.content && power_user.sysprompt.content.trim() !== '') {
                allPrompts.push({
                    name: "[系统预设] 主提示词 (Main Prompt)",
                    prompt: power_user.sysprompt.content
                });
            }
            if (power_user.sysprompt.post_history && power_user.sysprompt.post_history.trim() !== '') {
                allPrompts.push({
                    name: "[系统预设] 对话后指令 (Post-History)",
                    prompt: power_user.sysprompt.post_history
                });
            }
        }

        // 如果依然为空，给用户友好的提示
        if (allPrompts.length === 0) {
            $list.html(`
                <div style="text-align:center; padding: 20px; opacity:0.6;">
                    当前激活的预设中没有任何条目。<br>
                    <small style="font-size:0.8em; margin-top:5px; display:block;">
                        (提示: 如果你想导入其他预设里的条目，请先在左侧 ST 菜单切换预设，然后再点开本界面)
                    </small>
                </div>
            `);
            return;
        }

        // 绑定到全局供【导入所选项】按钮使用
        window.tutuTempNativePrompts = allPrompts;

        // 渲染卡片
        allPrompts.forEach((p, index) => {
            const name = p.name || "未命名";
            const promptText = p.prompt;

            const $card = $(`
                <label class="tutu-preset-card" style="display: flex; gap: 10px; align-items: flex-start; cursor: pointer;">
                    <input type="checkbox" class="tutu-import-checkbox" value="${index}" style="margin-top: 5px; width: 18px; height: 18px; cursor: pointer;">
                    <div style="flex:1; width: calc(100% - 30px);">
                        <div class="tutu-preset-name">${name}</div>
                        <div class="tutu-preset-text">${promptText}</div>
                    </div>
                </label>
            `);
            $list.append($card);
        });

        // 绑定反向更新全选框的事件
        $('.tutu-import-checkbox').off('change').on('change', function() {
            const total = $('.tutu-import-checkbox').length;
            const checked = $('.tutu-import-checkbox:checked').length;
            $('#tutu_select_all').prop('checked', total === checked);
        });
    }





    // ==========================================
    // 4. 事件绑定
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
        fetchAndRenderNativePrompts(); // 每次打开，实时请求并渲染最新打勾列表
        
        $('#tutu_theater_panel').fadeIn(200).css('display', 'flex'); 
    });

    $('#tutu_close').on('click', function() {
        $('#tutu_theater_panel').fadeOut(200);
    });

    // 全选/取消全选
    $('#tutu_select_all').on('change', function() {
        const isChecked = $(this).is(':checked');
        $('.tutu-import-checkbox').prop('checked', isChecked);
    });

    // ---【核心功能】：批量导入选中的条目 ---
    $('#tutu_import_selected_btn').on('click', function() {
        const checkedBoxes = $('.tutu-import-checkbox:checked');
        if (checkedBoxes.length === 0) {
            toastr.warning("请至少勾选一个要导入的条目！");
            return;
        }

        let importedCount = 0;
        checkedBoxes.each(function() {
            const index = $(this).val();
            const p = window.tutuTempNativePrompts[index];
            
            // 确保不导入空数据
            if (p) {
                tutuScenarios.push({
                    name: p.name || "导入的预设",
                    prompt: p.prompt || p.content || p.value || ""
                });
                importedCount++;
            }
        });

        // 存入 LocalStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
        
        toastr.success(`成功导入了 ${importedCount} 个剧本！`);
        renderLibrary(); // 刷新我的剧本列表
        $('.tutu-tab-btn[data-tab="tutu_tab_library"]').trigger('click'); // 自动跳回【我的剧本】Tab
    });

    // 保存单个新剧本
    $('#tutu_save_btn').on('click', function() {
        const name = $('#tutu_new_name').val().trim();
        const prompt = $('#tutu_prompt').val().trim();
        
        if (!name || !prompt) {
            toastr.warning("名字和当前生成框里的情境都不能为空！");
            return;
        }

        tutuScenarios.push({ name, prompt });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tutuScenarios));
        
        $('#tutu_new_name').val(''); 
        renderLibrary();
        toastr.success(`剧本 [${name}] 已保存！`);
    });

    // 生成
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
