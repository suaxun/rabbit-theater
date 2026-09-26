import { generateRaw } from "/script.js";

import {
    world_names,
    loadWorldInfo,
} from "/scripts/world-info.js";

import { getPresetManager } from "/scripts/preset-manager.js";





// 注：不需要引入 oai_settings 和 power_user 了，因为我们要直接读文件
jQuery(async () => {
    // ==========================================
    // 0. 数据存储管理 (LocalStorage)
    // ==========================================
const STORAGE_KEY = 'tutu_theater_scenarios';
const SETTINGS_KEY = 'tutu_theater_settings';
const API_PRESETS_KEY = 'tutu_theater_api_presets';

function loadLocalJson(key, defaultValue) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
        console.error(`读取 LocalStorage 失败：${key}`, error);
        return defaultValue;
    }
}

let tutuScenarios = loadLocalJson(STORAGE_KEY, []);

let tutuSettings = loadLocalJson(SETTINGS_KEY, {
    provider: 'main',       // main：酒馆主 API，secondary：副 API
    endpoint: '',
    apiKey: '',
    model: '',
});

let tutuApiPresets = loadLocalJson(API_PRESETS_KEY, []);

    if (tutuScenarios.length === 0) {
tutuScenarios = [
    {
        name: "🍳 厨房大乱斗",
        desc: "角色在厨房里手忙脚乱地准备晚餐。",
        prompt: "角色正在厨房里手忙脚乱地准备晚餐，结果把盐当成了糖..."
    }
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
            
            .tutu-preset-card {
    border: 1px solid var(--SmartThemeBorderColor);
    border-radius: 5px;
    padding: 10px;
    background: var(--SmartThemeBlurTintColor, transparent);
    color: var(--SmartThemeBodyColor);
    transition: 0.2s;
}

            .tutu-preset-card:hover { background: rgba(255,255,255,0.05); }
            .tutu-preset-name { font-weight: bold; color: var(--SmartThemeQuoteColor); font-size: 1.1em; margin-bottom: 5px; }
           .tutu-preset-text {
    font-size: 0.85em;
    opacity: 0.8;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 80px;
    overflow-y: auto;
    margin-bottom: 5px;
    background: var(--SmartThemeBlurTintColor, transparent);
    color: var(--SmartThemeBodyColor);
    padding: 5px;
    border-radius: 5px;
}

            
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
       <div id="tutu_theater_panel">


            
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
    <div class="tutu-tab-btn" data-tab="tutu_tab_settings">⚙️ 设置</div>
</div>


            <!-- TAB 1: 生成区 -->
            <div id="tutu_tab_generate" class="tutu-tab-content active">
                <textarea id="tutu_prompt" class="text_pole textarea_compact" rows="5" placeholder="输入情境，或者从剧本库加载..." style="width: 100%; box-sizing: border-box;"></textarea>
                <div id="tutu_generate_btn" class="menu_button" style="text-align: center; justify-content: center; padding: 10px;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> 导演！Action！
                </div>
<div id="tutu_result_box" class="tutu-result-box">

    <div class="tutu-result-toolbar">
        <div id="tutu_result_status" class="text_muted">
            这里将显示生成的小剧场内容...
        </div>

        <div class="tutu-result-mode-buttons">
            <div
                id="tutu_show_preview_btn"
                class="menu_button margin0 tutu-result-mode-btn active">
                <i class="fa-solid fa-display"></i>
                预览
            </div>

            <div
                id="tutu_show_source_btn"
                class="menu_button margin0 tutu-result-mode-btn">
                <i class="fa-solid fa-code"></i>
                源码
            </div>
        </div>
    </div>

    <div id="tutu_result_preview" class="tutu-result-preview">
        <div class="tutu-result-placeholder">
            这里将显示生成的小剧场内容...
        </div>
    </div>

    <pre id="tutu_result_source" class="tutu-result-source"></pre>
</div>
            </div>

<!-- TAB 2: 我的剧本库 -->
<div id="tutu_tab_library" class="tutu-tab-content">

    <!-- 新建剧本按钮 -->
    <div class="tutu-library-toolbar">
        <div class="tutu-library-title">
            <i class="fa-solid fa-book"></i>
            我的剧本
        </div>

        <div id="tutu_new_script_btn" class="menu_button margin0">
            <i class="fa-solid fa-plus"></i>
            新建剧本
        </div>
    </div>

    <!-- 新建 / 编辑剧本表单，默认隐藏 -->
    <div id="tutu_script_editor" class="tutu-script-editor" style="display:none;">

        <div class="tutu-editor-header">
            <strong id="tutu_editor_title">新建剧本</strong>

            <div id="tutu_cancel_edit_btn"
                 class="menu_button margin0 tutu-small-btn">
                取消
            </div>
        </div>

        <input
            type="text"
            id="tutu_script_name"
            class="text_pole"
            placeholder="剧本名称，例如：厨房大乱斗"
        >

        <input
            type="text"
            id="tutu_script_desc"
            class="text_pole"
            placeholder="简介，可不填写"
        >

        <textarea
            id="tutu_script_prompt"
            class="text_pole"
            rows="7"
            placeholder="请输入剧本内容或情境..."
        ></textarea>

        <div
            id="tutu_save_btn"
            class="menu_button tutu-save-script-btn">
            <i class="fa-solid fa-save"></i>
            保存剧本
        </div>
    </div>

    <!-- 剧本列表 -->
    <div id="tutu_library_list" class="tutu-library-list">
        <!-- JS 渲染的剧本库 -->
    </div>
</div>


            <!-- TAB 3: 多选批量导入系统预设 -->
            <div id="tutu_tab_import" class="tutu-tab-content">
                <div style="display:flex; gap:10px; margin-bottom: 10px;">
<select id="tutu_preset_type" class="text_pole" style="flex: 1; margin: 0;">
    <option value="openai" selected>对话补全预设 (Chat Completion)</option>
    <option value="worldbook">世界书 (World Info)</option>
</select>
                    <select id="tutu_preset_file" class="text_pole" style="flex: 2; margin: 0;">
                        <!-- JS 动态填充下拉列表 -->
                    </select>
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
                
                <div id="tutu_native_prompts_list" style="overflow-y:auto; max-height:250px; display:flex; flex-direction:column; gap:10px;">
                    <div style="text-align:center; padding: 20px;">请选择预设...</div>
                </div>
            </div>
<!-- TAB 4: 设置 -->
<div id="tutu_tab_settings" class="tutu-tab-content">

    <div class="tutu-settings-section">
        <div class="tutu-settings-title">
            <i class="fa-solid fa-robot"></i>
            小剧场生成 API
        </div>

        <label class="tutu-settings-label">
            生成方式
        </label>

        <select id="tutu_api_provider" class="text_pole">
            <option value="main">使用酒馆主 API</option>
            <option value="secondary">使用自定义副 API</option>
        </select>

        <div id="tutu_secondary_api_settings">

            <label class="tutu-settings-label">
                副 API 地址
            </label>

            <input
                id="tutu_secondary_endpoint"
                class="text_pole"
                type="text"
                placeholder="例如：https://api.openai.com/v1/chat/completions"
            >

            <label class="tutu-settings-label">
                API Key
            </label>

            <input
                id="tutu_secondary_api_key"
                class="text_pole"
                type="password"
                placeholder="sk-..."
            >

            <label class="tutu-settings-label">
                模型名称
            </label>

            <input
                id="tutu_secondary_model"
                class="text_pole"
                type="text"
                placeholder="例如：gpt-4o-mini"
            >

            <div class="tutu-api-help">
                副 API 需要兼容 OpenAI Chat Completions 格式。
                请求格式为：
                <code>/v1/chat/completions</code>
            </div>

            <div class="tutu-api-preset-row">
                <select id="tutu_api_preset_select" class="text_pole">
                    <option value="">选择已保存的副 API 预设</option>
                </select>

                <div
                    id="tutu_load_api_preset_btn"
                    class="menu_button margin0">
                    载入
                </div>
            </div>

            <div class="tutu-api-preset-row">
                <input
                    id="tutu_api_preset_name"
                    class="text_pole"
                    type="text"
                    placeholder="预设名称，例如：OpenAI"
                >

                <div
                    id="tutu_save_api_preset_btn"
                    class="menu_button margin0">
                    保存预设
                </div>

                <div
                    id="tutu_delete_api_preset_btn"
                    class="menu_button margin0">
                    删除预设
                </div>
            </div>

        </div>

        <div
            id="tutu_save_settings_btn"
            class="menu_button">
            <i class="fa-solid fa-save"></i>
            保存设置
        </div>
    </div>

</div>



        </div>
    `;

    $('body').append(panelHtml);

// 强制将面板挂到 body 直属层级，避免被 SillyTavern 的容器遮挡
const tutuPanel = document.getElementById('tutu_theater_panel');

if (tutuPanel && tutuPanel.parentElement !== document.body) {
    document.body.appendChild(tutuPanel);
}


    // ==========================================
    // 3. 核心逻辑函数
    // ==========================================
function updatePresetFileDropdown() {
    const type = $('#tutu_preset_type').val(); // 'worldbook' 或 'openai'
    const $fileSelect = $('#tutu_preset_file');

    $fileSelect.empty();

    if (type === 'worldbook') {
        // 读取 SillyTavern 的世界书列表
        const worldBooks = Array.isArray(world_names) ? world_names : [];

        if (worldBooks.length === 0) {
            $fileSelect.append(
                $('<option>', {
                    value: '',
                    text: '没有找到世界书'
                })
            );

            $('#tutu_native_prompts_list').html(
                '<div style="text-align:center; padding:20px; opacity:0.7;">没有找到世界书</div>'
            );

            return;
        }

        worldBooks.forEach(worldBookName => {
            $fileSelect.append(
                $('<option>', {
                    value: worldBookName,
                    text: worldBookName
                })
            );
        });

        // 默认选中第一本世界书
        $fileSelect.prop('selectedIndex', 0);

        fetchAndRenderNativePrompts();
        return;
    }

    // 对话补全预设
    const sourceSelector = '#settings_preset_openai';

    $(sourceSelector + ' option').each(function () {
        const val = $(this).val();
        const text = $(this).text().trim();

        // 跳过空选项
        if (text && val !== undefined) {
            $fileSelect.append(
                $('<option>', {
                    value: text,
                    text: text
                })
            );
        }
    });

    // 默认选中当前正在使用的对话补全预设
    const currentActiveName = $(sourceSelector + ' option:selected')
        .text()
        .trim();

    if (currentActiveName) {
        $fileSelect.val(currentActiveName);
    }

    fetchAndRenderNativePrompts();
}



    // Tab 切换逻辑
    $('.tutu-tab-btn').on('click', function() {
        $('.tutu-tab-btn').removeClass('active');
        $('.tutu-tab-content').removeClass('active');
        $(this).addClass('active');
        $(`#${$(this).data('tab')}`).addClass('active');
    });

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function isProbablyHtml(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }

    const value = text.trim();

    return (
        /^<!doctype html/i.test(value) ||
        /^<html[\s>]/i.test(value) ||
        /<(div|section|article|main|body|style|table|h1|h2|p|img|button|form)[\s>]/i.test(value)
    );
}

function showTutuResult(content) {
    content = String(content || '');

    $('#tutu_result_source').text(content);
    $('#tutu_result_status').text(
        isProbablyHtml(content)
            ? '检测到 HTML 内容，可以切换到预览模式。'
            : '生成完成。'
    );

    const $preview = $('#tutu_result_preview');
    $preview.empty();

    if (!content.trim()) {
        $preview.html(`
            <div class="tutu-result-placeholder">
                没有生成内容。
            </div>
        `);
        return;
    }

    if (isProbablyHtml(content)) {
        const iframe = document.createElement('iframe');

        /*
         * sandbox 可以防止生成的 HTML 直接操作酒馆页面。
         * 如果你确实需要 HTML 内的 JavaScript，
         * 可以改成：iframe.setAttribute('sandbox', 'allow-scripts');
         *
         * 但不建议允许脚本操作父页面。
         */
// 允许生成页面运行 JavaScript。
// 不添加 allow-same-origin，避免生成内容访问酒馆页面的 Cookie、LocalStorage 等。
iframe.setAttribute(
    'sandbox',
    'allow-scripts allow-forms allow-modals'
);

iframe.srcdoc = content;


        $preview.append(iframe);

        $('#tutu_show_preview_btn').show();
        $('#tutu_show_source_btn').show();

        showTutuResultMode('preview');
    } else {
        const $plain = $('<div class="tutu-plain-preview"></div>');
        $plain.text(content);

        $preview.append($plain);

        $('#tutu_show_preview_btn').show();
        $('#tutu_show_source_btn').show();

        showTutuResultMode('preview');
    }
}

function showTutuResultMode(mode) {
    if (mode === 'source') {
        $('#tutu_result_preview').hide();
        $('#tutu_result_source').show();

        $('#tutu_show_source_btn').addClass('active');
        $('#tutu_show_preview_btn').removeClass('active');
    } else {
        $('#tutu_result_preview').show();
        $('#tutu_result_source').hide();

        $('#tutu_show_preview_btn').addClass('active');
        $('#tutu_show_source_btn').removeClass('active');
    }
}
async function generateBySecondaryApi(prompt) {
    const endpoint = $('#tutu_secondary_endpoint').val().trim();
    const apiKey = $('#tutu_secondary_api_key').val().trim();
    const model = $('#tutu_secondary_model').val().trim();

    if (!endpoint) {
        throw new Error('没有填写副 API 地址');
    }

    if (!model) {
        throw new Error('没有填写副 API 模型名称');
    }

    const headers = {
        'Content-Type': 'application/json',
    };

    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                }
            ],
            temperature: 0.8,
        }),
    });

    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(
            `副 API 请求失败：HTTP ${response.status}\n${responseText}`
        );
    }

    let data;

    try {
        data = JSON.parse(responseText);
    } catch {
        // 如果接口直接返回纯文本，也支持
        return responseText;
    }

    /*
     * OpenAI Chat Completions 常见格式：
     * {
     *   choices: [
     *     {
     *       message: {
     *         content: "..."
     *       }
     *     }
     *   ]
     * }
     */

    const result =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        data?.output_text ??
        data?.output ??
        data?.content ??
        data?.text;

    if (result === undefined || result === null) {
        throw new Error(
            '副 API 返回的数据中没有找到文本内容：\n' +
            JSON.stringify(data, null, 2)
        );
    }

    if (Array.isArray(result)) {
        return result
            .map(item => {
                if (typeof item === 'string') return item;
                return item?.text || item?.content || '';
            })
            .join('');
    }

    return String(result);
}

function saveTutuSettings() {
    tutuSettings = {
        provider: $('#tutu_api_provider').val() || 'main',
        endpoint: $('#tutu_secondary_endpoint').val().trim(),
        apiKey: $('#tutu_secondary_api_key').val().trim(),
        model: $('#tutu_secondary_model').val().trim(),
    };

    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(tutuSettings)
    );
}

function renderApiPresetDropdown() {
    const $select = $('#tutu_api_preset_select');

    if (!$select.length) return;

    $select.empty();

    $select.append(
        $('<option>', {
            value: '',
            text: '选择已保存的副 API 预设'
        })
    );

    tutuApiPresets.forEach((preset, index) => {
        $select.append(
            $('<option>', {
                value: String(index),
                text: preset.name
            })
        );
    });
}

function loadTutuSettingsToUI() {
    $('#tutu_api_provider').val(tutuSettings.provider || 'main');
    $('#tutu_secondary_endpoint').val(tutuSettings.endpoint || '');
    $('#tutu_secondary_api_key').val(tutuSettings.apiKey || '');
    $('#tutu_secondary_model').val(tutuSettings.model || '');

    updateSecondaryApiVisibility();
    renderApiPresetDropdown();
}

function updateSecondaryApiVisibility() {
    const provider = $('#tutu_api_provider').val();

    if (provider === 'secondary') {
        $('#tutu_secondary_api_settings').show();
    } else {
        $('#tutu_secondary_api_settings').hide();
    }
}

function saveCurrentApiPreset() {
    const name = $('#tutu_api_preset_name').val().trim();
    const endpoint = $('#tutu_secondary_endpoint').val().trim();
    const apiKey = $('#tutu_secondary_api_key').val().trim();
    const model = $('#tutu_secondary_model').val().trim();

    if (!name) {
        toastr.warning('请输入预设名称');
        return;
    }

    if (!endpoint) {
        toastr.warning('请输入副 API 地址');
        return;
    }

    if (!model) {
        toastr.warning('请输入模型名称');
        return;
    }

    const preset = {
        name,
        endpoint,
        apiKey,
        model,
    };

    const oldIndex = tutuApiPresets.findIndex(item => item.name === name);

    if (oldIndex >= 0) {
        tutuApiPresets[oldIndex] = preset;
    } else {
        tutuApiPresets.push(preset);
    }

    localStorage.setItem(
        API_PRESETS_KEY,
        JSON.stringify(tutuApiPresets)
    );

    renderApiPresetDropdown();

    toastr.success(`副 API 预设「${name}」已保存`);
}

function loadSelectedApiPreset() {
    const index = Number($('#tutu_api_preset_select').val());

    if (!Number.isInteger(index) || !tutuApiPresets[index]) {
        toastr.warning('请选择一个副 API 预设');
        return;
    }

    const preset = tutuApiPresets[index];

    $('#tutu_secondary_endpoint').val(preset.endpoint || '');
    $('#tutu_secondary_api_key').val(preset.apiKey || '');
    $('#tutu_secondary_model').val(preset.model || '');
    $('#tutu_api_preset_name').val(preset.name || '');

    toastr.success(`已载入副 API 预设：${preset.name}`);
}

function deleteSelectedApiPreset() {
    const index = Number($('#tutu_api_preset_select').val());

    if (!Number.isInteger(index) || !tutuApiPresets[index]) {
        toastr.warning('请选择一个副 API 预设');
        return;
    }

    const preset = tutuApiPresets[index];

    if (!confirm(`确定要删除副 API 预设「${preset.name}」吗？`)) {
        return;
    }

    tutuApiPresets.splice(index, 1);

    localStorage.setItem(
        API_PRESETS_KEY,
        JSON.stringify(tutuApiPresets)
    );

    renderApiPresetDropdown();

    toastr.success('副 API 预设已删除');
}

let editingScriptIndex = -1;

function openScriptEditor(index = -1) {
    editingScriptIndex = index;

    $('#tutu_script_editor').show();

    if (index === -1) {
        $('#tutu_editor_title').text('新建剧本');
        $('#tutu_script_name').val('');
        $('#tutu_script_desc').val('');
        $('#tutu_script_prompt').val('');
    } else {
        const item = tutuScenarios[index];

        $('#tutu_editor_title').text('编辑剧本');
        $('#tutu_script_name').val(item.name || '');
        $('#tutu_script_desc').val(item.desc || '');
        $('#tutu_script_prompt').val(item.prompt || '');
    }

    $('#tutu_script_name').trigger('focus');
}

function renderLibrary() {
    const $list = $('#tutu_library_list');
    $list.empty();

    if (tutuScenarios.length === 0) {
        $list.html(`
            <div class="tutu-empty-library">
                <i class="fa-solid fa-book-open"></i>
                <div>还没有剧本</div>
                <small>点击上方“新建剧本”创建一个吧</small>
            </div>
        `);
        return;
    }

    tutuScenarios.forEach((item, index) => {
        const name = escapeHtml(item.name || '未命名剧本');
        const desc = escapeHtml(item.desc || '暂无简介');
        const prompt = escapeHtml(item.prompt || '');

        const $item = $(`
            <div class="tutu-preset-card tutu-script-card">

                <div class="tutu-script-main">
                    <div class="tutu-script-name">
                        ${name}
                    </div>

                    <div class="tutu-script-desc">
                        ${desc}
                    </div>

                    <!-- 内容默认隐藏 -->
                    <div
                        class="tutu-script-content"
                        style="display:none;">
                        ${prompt}
                    </div>
                </div>

<div class="tutu-script-actions">

    <!-- 载入 -->
    <div
        class="menu_button margin0 tutu-icon-btn tutu-load-script-btn"
        data-index="${index}"
        title="载入剧本"
        aria-label="载入剧本">
        <i class="fa-solid fa-play"></i>
    </div>

    <!-- 查看 -->
    <div
        class="menu_button margin0 tutu-icon-btn tutu-view-script-btn"
        data-index="${index}"
        title="查看剧本内容"
        aria-label="查看剧本内容">
        <i class="fa-solid fa-eye"></i>
    </div>

    <!-- 编辑 -->
    <div
        class="menu_button margin0 tutu-icon-btn tutu-edit-script-btn"
        data-index="${index}"
        title="编辑剧本"
        aria-label="编辑剧本">
        <i class="fa-solid fa-pen"></i>
    </div>

    <!-- 删除 -->
    <div
        class="menu_button margin0 tutu-icon-btn tutu-delete-script-btn"
        data-index="${index}"
        title="删除剧本"
        aria-label="删除剧本">
        <i class="fa-solid fa-trash-can"></i>
    </div>

</div>


            </div>
        `);

        $list.append($item);
    });
}


    async function fetchAndRenderNativePrompts() {
        const $list = $('#tutu_native_prompts_list');
        const type = $('#tutu_preset_type').val(); // 'sysprompt' 或 'openai'
        const fileName = $('#tutu_preset_file').val();
        
        if (!fileName) return;
        
        $list.html('<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> 读取中...</div>');
        $('#tutu_select_all').prop('checked', false);

let allPrompts = [];
let data = null;

try {
    // ================================
    // 世界书
    // ================================
    if (type === 'worldbook') {
        data = await loadWorldInfo(fileName);

        if (!data) {
            throw new Error('世界书内容为空');
        }

        console.log('读取到的世界书数据：', data);

        // SillyTavern 世界书的 entries 通常是对象：
        // {
        //     uid1: {...},
        //     uid2: {...}
        // }
        const entries = Array.isArray(data.entries)
            ? data.entries
            : Object.values(data.entries || {});

        entries.forEach((entry, index) => {
            if (!entry) return;

            const promptText = String(entry.content || '').trim();

            // 没有正文的条目不导入
            if (!promptText) return;

            let entryName =
                entry.comment ||
                entry.name ||
                (Array.isArray(entry.key)
                    ? entry.key.join(', ')
                    : entry.key) ||
                `世界书条目 ${index + 1}`;

            // 给禁用条目加一个标记，但仍然允许用户手动选择导入
            if (entry.enabled === false) {
                entryName = `🚫 [禁用] ${entryName}`;
            }

            allPrompts.push({
                name: entryName,
                prompt: promptText
            });
        });
    }

    // ================================
    // 对话补全预设
    // ================================
    else if (type === 'openai') {
        const manager = getPresetManager('openai');

        if (!manager) {
            throw new Error('找不到对话补全预设管理器');
        }

        data = await manager.getCompletionPresetByName(fileName);

        if (!data) {
            throw new Error('对话补全预设内容为空');
        }

        console.log('读取到的对话补全预设数据：', data);

        const pmArray = data.prompts || data.prompt_manager || [];

        pmArray.forEach(p => {
            if (!p) return;

            const promptText =
                p.content ||
                p.prompt ||
                p.value ||
                p.text ||
                '';

            if (p.name && String(promptText).trim()) {
                allPrompts.push({
                    name: p.name,
                    prompt: String(promptText)
                });
            }
        });
    }
}
catch (error) {
    console.error('读取预设或世界书失败:', error);

    $list.html(
        '<div style="text-align:center; color:red; padding:20px;">' +
        '读取失败，请检查控制台。' +
        '</div>'
    );

    return;
}



        if (allPrompts.length === 0) {
            $list.html('<div style="text-align:center; padding: 20px; opacity:0.6;">选中的预设中没有任何内容。</div>');
            return;
        }

        window.tutuTempNativePrompts = allPrompts;
        $list.empty();

        // 渲染列表：带【查看】按钮和默认隐藏的正文内容区
        allPrompts.forEach((p, index) => {
            const name = p.name || "未命名";
            const promptText = p.prompt;

            const $card = $(`
                <div class="tutu-preset-card" style="display: flex; flex-direction: column; gap: 5px;">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="checkbox" class="tutu-import-checkbox" value="${index}" style="width: 18px; height: 18px; cursor: pointer;">
                        <div class="tutu-preset-name" style="flex:1; margin:0; cursor: pointer;">${name}</div>
                        <!-- 查看按钮 -->
                        <div class="menu_button margin0 tutu-view-btn" data-index="${index}" style="font-size:0.8em; padding: 5px 10px; min-width: 60px; justify-content: center;">
                            <i class="fa-solid fa-eye"></i> 查看
                        </div>
                    </div>
                    <!-- 隐藏的正文内容 -->
                    <div
    class="tutu-preset-text tutu-hidden-content-${index}"
    style="
        display:none;
        margin-top:5px;
        background:var(--SmartThemeBlurTintColor);
        color:var(--SmartThemeBodyColor);
        padding:8px;
        border-radius:5px;
        white-space:pre-wrap;
        word-break:break-all;
        max-height:150px;
        overflow-y:auto;
    "
>${promptText}</div>

                </div>
            `);
            $list.append($card);
        });

        // 绑定全选框反向更新逻辑
        $('.tutu-import-checkbox').on('change', function() {
            const total = $('.tutu-import-checkbox').length;
            const checked = $('.tutu-import-checkbox:checked').length;
            $('#tutu_select_all').prop('checked', total === checked);
        });

        // 点击条目名字，触发多选框选中/取消选中
        $('.tutu-preset-name').on('click', function() {
            const $checkbox = $(this).prev('.tutu-import-checkbox');
            $checkbox.prop('checked', !$checkbox.prop('checked')).trigger('change');
        });

        // 绑定“查看”按钮的展开/折叠逻辑
        $('.tutu-view-btn').on('click', function() {
            const index = $(this).data('index');
            const $content = $('.tutu-hidden-content-' + index);
            $content.slideToggle(150); 
        });
    }







    // ==========================================
    // 4. 事件绑定
    // ==========================================
    // 初始化设置界面
loadTutuSettingsToUI();

// 切换主 API / 副 API
$(document).on('change', '#tutu_api_provider', function() {
    updateSecondaryApiVisibility();
});

// 保存 API 设置
$(document).on('click', '#tutu_save_settings_btn', function() {
    saveTutuSettings();
    toastr.success('小剧场 API 设置已保存');
});

// 保存副 API 预设
$(document).on('click', '#tutu_save_api_preset_btn', function() {
    saveCurrentApiPreset();
});

// 载入副 API 预设
$(document).on('click', '#tutu_load_api_preset_btn', function() {
    loadSelectedApiPreset();
});

// 删除副 API 预设
$(document).on('click', '#tutu_delete_api_preset_btn', function() {
    deleteSelectedApiPreset();
});

// 结果显示为预览
$(document).on('click', '#tutu_show_preview_btn', function() {
    showTutuResultMode('preview');
});

// 结果显示为源码
$(document).on('click', '#tutu_show_source_btn', function() {
    showTutuResultMode('source');
});

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
    if (extensionsMenu) {
        extensionsMenu.style.display = 'none';
    }

    renderLibrary();
    updatePresetFileDropdown();

    const $panel = $('#tutu_theater_panel');
    const isMobile = window.matchMedia('(max-width: 600px)').matches;

    // 先清除旧状态
    $panel.stop(true, true).removeClass('tutu-mobile-mode');

    if (isMobile) {
        $panel.addClass('tutu-mobile-mode');
    }

    // 用 cssText 强制重置定位，防止残留内联样式
    $panel[0].style.cssText =
        'display:flex; opacity:0;' +
        'top:50%; left:50%; transform:translate(-50%,-50%);';

    $panel.animate({ opacity: 1 }, 200);
});




    // 监听类型下拉框改变：切换系统/OAI预设
    $(document).on('change', '#tutu_preset_type', function() {
        updatePresetFileDropdown();
    });

    // 监听文件下拉框改变：读取对应文件
    $(document).on('change', '#tutu_preset_file', function() {
        fetchAndRenderNativePrompts();
    });


$(document).on('click', '#tutu_close', function() {
    $('#tutu_theater_panel')
        .stop(true, true)
        .animate({ opacity: 0 }, 200, function() {
            $(this)[0].style.cssText = 'display:none;';
            $(this).removeClass('tutu-mobile-mode');
        });
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
    desc: `从系统预设导入`,
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

// 点击“新建剧本”
$(document).on('click', '#tutu_new_script_btn', function() {
    openScriptEditor(-1);
});

// 点击“取消编辑”
$(document).on('click', '#tutu_cancel_edit_btn', function() {
    editingScriptIndex = -1;
    $('#tutu_script_editor').slideUp(150);
});

// 保存新建或编辑的剧本
$(document).on('click', '#tutu_save_btn', function() {
    const name = $('#tutu_script_name').val().trim();
    const desc = $('#tutu_script_desc').val().trim();
    const prompt = $('#tutu_script_prompt').val().trim();

    if (!name) {
        toastr.warning('请输入剧本名称！');
        return;
    }

    if (!prompt) {
        toastr.warning('请输入剧本内容！');
        return;
    }

    const newScript = {
        name,
        desc,
        prompt
    };

    if (editingScriptIndex === -1) {
        // 新建
        tutuScenarios.push(newScript);
        toastr.success(`剧本 [${name}] 已创建！`);
    } else {
        // 编辑
        tutuScenarios[editingScriptIndex] = newScript;
        toastr.success(`剧本 [${name}] 已更新！`);
    }

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tutuScenarios)
    );

    renderLibrary();

    editingScriptIndex = -1;
    $('#tutu_script_editor').slideUp(150);
});
// 查看 / 隐藏剧本内容
$(document).on('click', '.tutu-view-script-btn', function() {
    const $card = $(this).closest('.tutu-script-card');
    const $content = $card.find('.tutu-script-content');

    const isVisible = $content.is(':visible');

    if (isVisible) {
        $content.slideUp(150);
        $(this).html(`
            <i class="fa-solid fa-eye"></i>
            查看
        `);
    } else {
        $content.slideDown(150);
        $(this).html(`
            <i class="fa-solid fa-eye-slash"></i>
            隐藏
        `);
    }
});
// 载入剧本到生成页面
$(document).on('click', '.tutu-load-script-btn', function() {
    // 获取当前按钮上的剧本编号
    const index = Number($(this).data('index'));

    // 根据编号找到对应的剧本
    const item = tutuScenarios[index];

    // 如果没有找到剧本，就停止
    if (!item) {
        toastr.error('找不到这个剧本');
        return;
    }

    // 把剧本正文放进“生成”标签页的输入框
    $('#tutu_prompt').val(item.prompt || '');

    // 切换到“生成”标签页
    $('.tutu-tab-btn[data-tab="tutu_tab_generate"]').trigger('click');

    // 提示用户
    toastr.info(`已载入：${item.name}`, '兔兔小剧场');
});

// 编辑剧本
$(document).on('click', '.tutu-edit-script-btn', function() {
    const index = Number($(this).data('index'));
    openScriptEditor(index);
});

// 删除剧本
$(document).on('click', '.tutu-delete-script-btn', function() {
    const index = Number($(this).data('index'));
    const item = tutuScenarios[index];

    if (!item) return;

    const confirmed = confirm(`确定要删除剧本「${item.name}」吗？`);

    if (!confirmed) return;

    tutuScenarios.splice(index, 1);

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tutuScenarios)
    );

    renderLibrary();

    toastr.success('剧本已删除');
});


// 生成小剧场
$('#tutu_generate_btn').on('click', async function() {
    const userScenario = $('#tutu_prompt').val().trim();

    if (!userScenario) {
        toastr.warning('请先输入剧场情境！');
        return;
    }

    const provider = $('#tutu_api_provider').val() || 'main';

    $('#tutu_result_status').text('🐰 兔兔正在疯狂码字中...');
    $('#tutu_result_preview').html(`
        <div class="tutu-result-placeholder">
            🐰 兔兔正在疯狂码字中...
        </div>
    `);

    $('#tutu_result_source').text('');
    $('#tutu_generate_btn').addClass('disabled');

    try {
        const context = SillyTavern.getContext();

        const charName =
            context.characterId !== undefined &&
            context.characters?.[context.characterId]
                ? context.characters[context.characterId].name
                : 'AI';

        const aiPrompt = `
请根据以下情境，写一段关于「${charName}」的外置小剧场。

要求：
1. 这是独立于正文对话之外的番外内容。
2. 内容要生动、有画面感、有一定故事性。
3. 不要解释你的写作过程。
4. 如果用户要求 HTML，请直接输出完整可渲染的 HTML。
5. 如果输出 HTML，不要使用 Markdown 代码围栏，不要输出 \`\`\`html。
6. 如果没有要求 HTML，则输出普通纯文字。

用户提供的情境：
${userScenario}
        `.trim();

        let result;

        if (provider === 'secondary') {
            // 使用自定义副 API
            result = await generateBySecondaryApi(aiPrompt);
        } else {
            // 使用酒馆当前主 API
            result = await generateRaw({
                prompt: aiPrompt,
                quietToLoud: false,
                isImpersonate: false,
            });
        }

        showTutuResult(result);
    } catch (error) {
        console.error('小剧场生成失败：', error);

        $('#tutu_result_status').text('❌ 生成失败');
        $('#tutu_result_preview').html(`
            <div class="tutu-result-placeholder" style="color:red;">
                ❌ 生成失败：${escapeHtml(error.message || error)}
            </div>
        `);

        toastr.error(error.message || '生成失败，请检查 API 配置');
    } finally {
        $('#tutu_generate_btn').removeClass('disabled');
    }
});

});
