    // 渲染：带复选框的系统预设列表 (直接从 ST 内存对象中读取)
    function fetchAndRenderNativePrompts() {
        const $list = $('#tutu_native_prompts_list');
        $list.empty();
        $('#tutu_select_all').prop('checked', false);

        let allPrompts = [];
        
        // 核心魔法：直接读取刚才在文件头部导入的 oai_settings 内存对象
        // 当前下拉框选择的预设里面的所有条目，永远都在 oai_settings.prompt_manager 这个数组里
        if (typeof oai_settings !== 'undefined' && Array.isArray(oai_settings.prompt_manager)) {
            oai_settings.prompt_manager.forEach(p => {
                // 只要有名字和正文，就抓取下来
                if (p.name && p.prompt) {
                    allPrompts.push({
                        name: p.name,
                        prompt: p.prompt
                    });
                }
            });
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
            const promptText = p.prompt || p.content || p.value || "【无正文内容】";

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
        $('.tutu-import-checkbox').on('change', function() {
            const total = $('.tutu-import-checkbox').length;
            const checked = $('.tutu-import-checkbox:checked').length;
            $('#tutu_select_all').prop('checked', total === checked);
        });
    }
