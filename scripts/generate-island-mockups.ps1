param(
    [Parameter(Mandatory = $true)]
    [string]$ApiKey,
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,
    [switch]$ReuseIdle
)

$ErrorActionPreference = "Stop"
$baseUrl = "https://image.codesonline.dev/v1"
$headers = @{ Authorization = "Bearer $ApiKey" }

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

function Save-ImageResponse {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Response,
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $item = $Response.data[0]
    if ($item.b64_json) {
        [IO.File]::WriteAllBytes($Path, [Convert]::FromBase64String($item.b64_json))
        return
    }
    if (-not $item.url) {
        throw "Image response did not include a URL or base64 payload."
    }
    Invoke-WebRequest -Uri $item.url -OutFile $Path
}

$idlePrompt = @'
Use case: ui-mockup
Asset type: high-fidelity desktop application interface design
Primary request: Design a Chinese AI creation workspace at exactly 1672x940, showing the idle state of a full-width dynamic island header. This is a realistic implementable SaaS product UI, not concept art.
Layout: a slim light left sidebar about 96px wide; the main content starts immediately to its right. The full-width dynamic island occupies the entire top area of the main content, extending from the sidebar edge to the right screen edge. It is not a centered capsule. Below it, preserve a spacious white creation workspace with centered title, the existing large local composer/search box, compact tool controls, and a row of recent generated-image thumbnails near the bottom.
Dynamic island idle state: 68px high, a light translucent glass header that harmonizes with a white and pale-gray SaaS interface. Use a soft white-to-very-light-blue surface, hairline gray border, restrained blue-violet aurora sheen, subtle particles, gentle shadow, and a thin cool-blue lower edge. Do not make the idle header dark. Show the current workspace and four compact navigation entries centered inside the header. Only “电商套图” is active. The entries are “造梦”, “图片生成”, “电商套图”, “视频生成”. Keep necessary notification, theme, and account icon buttons on the right.
Main text (verbatim): “电商套图”, “从一个想法开始”, “描述商品卖点、场景、风格和指定文案”, “添加参考素材”, “智能规划”, “生成数量”, “方 1 · 长 5 · 详情 10”.
Style: polished modern Chinese productivity SaaS, strong stage presence in the top header, calm white main workspace, crisp sans-serif typography, practical spacing, clear controls, realistic screenshots, subtle gray borders.
Constraints: no MNS logo, no third-party brand, no marketing slogan, no nested cards, no fixed floating capsule header, no blurred or illegible fake text, no watermark. The composer size and main body layout must remain practical and visually consistent.
'@

$idleBody = @{
    model = "gpt-image-2-adobe"
    prompt = $idlePrompt
    n = 1
    size = "16:9"
    quality = "high"
    upscale = "4k"
    response_format = "b64_json"
    output_format = "png"
} | ConvertTo-Json -Depth 5

$idlePath = Join-Path $OutputDirectory "full-width-island-idle.png"
if (-not $ReuseIdle) {
    $idleResponse = Invoke-RestMethod -Method Post -Uri "$baseUrl/images/generations" -Headers $headers -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($idleBody))
    Save-ImageResponse -Response $idleResponse -Path $idlePath
} elseif (-not (Test-Path -LiteralPath $idlePath)) {
    throw "The idle-state image does not exist."
}
$editSourcePath = Join-Path $OutputDirectory "idle-edit-source.png"
if (-not (Test-Path -LiteralPath $editSourcePath)) { Copy-Item -LiteralPath $idlePath -Destination $editSourcePath }

function Edit-State {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt,
        [Parameter(Mandatory = $true)]
        [string]$OutputName
    )

    $response = Invoke-RestMethod -Method Post -Uri "$baseUrl/images/edits" -Headers $headers -Form @{
        model = "gpt-image-2"
        prompt = $Prompt
        image = Get-Item $editSourcePath
        n = "1"
        size = "16:9"
        quality = "high"
        upscale = "4k"
        response_format = "b64_json"
        output_format = "png"
    }
    Save-ImageResponse -Response $response -Path (Join-Path $OutputDirectory $OutputName)
}

Edit-State -OutputName "full-width-island-running.png" -Prompt @'
Use case: precise-object-edit
Primary request: Change only the full-width top dynamic island from idle navigation to the active generation state. Keep the exact same 1672x940 page layout, left sidebar, composer, controls, typography, spacing, recent-result thumbnails, and all main content unchanged.
Top header changes: temporarily collapse the four workspace navigation entries so the center becomes a task display. Keep the header mostly light glass to match the white application, with only a localized soft blue-violet glow behind the task. Add a restrained flowing light band and sparse particles, never a full dark background. At the left of the main header content show a back arrow and the project name “电商套图项目：主图创意 1”. Under it show “正在生成 · 方图 1/1 · 长图 3/5 · 详情图 6/10 · 已用时 12 秒”. Add a very thin cool-blue luminous progress line along the bottom edge at about 63%. Keep the notification, theme, and account controls at the right. Make the task area visibly clickable but not button-like.
Text (verbatim): “电商套图项目：主图创意 1”, “正在生成”, “方图 1/1”, “长图 3/5”, “详情图 6/10”, “已用时 12 秒”.
Constraints: change only the top dynamic island state; preserve everything else exactly; no MNS logo; no third-party branding; no capsule; no illegible text; no watermark.
'@

Edit-State -OutputName "full-width-island-completed.png" -Prompt @'
Use case: precise-object-edit
Primary request: Change only the full-width top dynamic island from idle navigation to the completed task state. Keep the exact same 1672x940 page layout, left sidebar, composer, controls, typography, spacing, recent-result thumbnails, and all main content unchanged.
Top header changes: use stable light translucent glass with the aurora motion visually settled and a very soft blue-green completion glow. Show a clear completion check icon, project name “电商套图项目：主图创意 1”, and the summary “生成完成 · 16/16 · 用时 15 秒”. Add a compact text action “查看结果” and a small close icon. The bottom cool-blue progress line is fully complete. Keep notification, theme, and account controls at the right.
Text (verbatim): “电商套图项目：主图创意 1”, “生成完成”, “16/16”, “用时 15 秒”, “查看结果”.
Constraints: change only the top dynamic island state; preserve everything else exactly; no MNS logo; no third-party branding; no capsule; no illegible text; no watermark.
'@

Write-Output $OutputDirectory

