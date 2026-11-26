$ErrorActionPreference = "Stop"
$path = if ($args.Count -ge 1) { $args[0] } else { "C:\Users\USER\AppData\Local\Temp\opencode\template_extract\word\document.xml" }
[xml]$doc = Get-Content $path -Encoding UTF8
$ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
$wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

function A($node, $name) {
  if ($null -eq $node) { return $null }
  $v = $node.GetAttribute($name, $wNs)
  if ([string]::IsNullOrEmpty($v)) { return $null }
  return $v
}

function Show-Runs($p) {
  $parts = @()
  foreach ($r in $p.SelectNodes("w:r", $ns)) {
    $t = ($r.SelectNodes("w:t", $ns) | ForEach-Object { $_.InnerText }) -join ""
    if ([string]::IsNullOrEmpty($t)) { $t = "[]" }
    $rPr = $r.SelectSingleNode("w:rPr", $ns)
    $b = if ($rPr -and $rPr.SelectSingleNode("w:b", $ns)) { "B" } else { "" }
    $sz = if ($rPr) { A ($rPr.SelectSingleNode("w:sz", $ns)) "val" } else { $null }
    $u = if ($rPr) { A ($rPr.SelectSingleNode("w:u", $ns)) "val" } else { $null }
    $font = if ($rPr) { A ($rPr.SelectSingleNode("w:rFonts", $ns)) "ascii" } else { $null }
    $meta = @()
    if ($b) { $meta += $b }
    if ($sz) { $meta += "sz$sz" }
    if ($u) { $meta += "u$u" }
    if ($font) { $meta += $font }
    $suffix = if ($meta.Count -gt 0) { "{" + ($meta -join ",") + "}" } else { "" }
    $parts += "'$t'$suffix"
  }
  return ($parts -join " ")
}

function Show-Para($p) {
  $text = ($p.SelectNodes(".//w:t", $ns) | ForEach-Object { $_.InnerText }) -join ""
  $pPr = $p.SelectSingleNode("w:pPr", $ns)
  $style = if ($pPr) { A ($pPr.SelectSingleNode("w:pStyle", $ns)) "val" } else { $null }
  $jc = if ($pPr) { A ($pPr.SelectSingleNode("w:jc", $ns)) "val" } else { $null }
  $keepNext = if ($pPr -and $pPr.SelectSingleNode("w:keepNext", $ns)) { "keepNext" } else { "" }
  $ind = if ($pPr) { $pPr.SelectSingleNode("w:ind", $ns) } else { $null }
  $indStr = @()
  foreach ($n in @("left", "right", "firstLine", "hanging", "start")) {
    $v = A $ind $n
    if ($v) { $indStr += "$n=$v" }
  }
  $sp = if ($pPr) { $pPr.SelectSingleNode("w:spacing", $ns) } else { $null }
  $spStr = @()
  foreach ($n in @("before", "after", "line", "lineRule")) {
    $v = A $sp $n
    if ($v) { $spStr += "$n=$v" }
  }
  $tabs = if ($pPr) { $pPr.SelectNodes("w:tabs/w:tab", $ns) | ForEach-Object { "$(A $_ 'val')@$(A $_ 'pos')" } } else { @() }
  $numPr = if ($pPr) { $pPr.SelectSingleNode("w:numPr", $ns) } else { $null }
  $num = ""
  if ($numPr) { $num = "numId=$(A ($numPr.SelectSingleNode('w:numId',$ns)) 'val') ilvl=$(A ($numPr.SelectSingleNode('w:ilvl',$ns)) 'val')" }
  $line = "P '$text'"
  $meta = @()
  if ($style) { $meta += "style=$style" }
  if ($jc) { $meta += "jc=$jc" }
  if ($keepNext) { $meta += $keepNext }
  if ($indStr) { $meta += "ind[" + ($indStr -join ",") + "]" }
  if ($spStr) { $meta += "spacing[" + ($spStr -join ",") + "]" }
  if ($tabs) { $meta += "tabs[" + ($tabs -join ",") + "]" }
  if ($num) { $meta += $num }
  $runs = Show-Runs $p
  if ($meta) { $line += " | " + ($meta -join " ") }
  if ($runs) { $line += " | " + $runs }
  Write-Output $line
}

function Show-Table($tbl) {
  $tblPr = $tbl.SelectSingleNode("w:tblPr", $ns)
  $width = if ($tblPr) { A ($tblPr.SelectSingleNode("w:tblW", $ns)) "w" } else { $null }
  $layout = if ($tblPr) { A ($tblPr.SelectSingleNode("w:tblLayout", $ns)) "type" } else { $null }
  $grid = ($tbl.SelectNodes("w:tblGrid/w:gridCol", $ns) | ForEach-Object { A $_ "w" }) -join ","
  $tblInd = if ($tblPr) { A ($tblPr.SelectSingleNode("w:tblInd", $ns)) "w" } else { $null }
  $cellMar = if ($tblPr) { $tblPr.SelectSingleNode("w:tblCellMar", $ns) } else { $null }
  $marStr = ""
  if ($cellMar) {
    $marStr = (@("left","right","top","bottom") | ForEach-Object {
      $n = $cellMar.SelectSingleNode("w:$_", $ns)
      if ($n) { "$_=$(A $n 'w')" }
    }) -join ","
  }
  Write-Output "TABLE width=$width layout=$layout grid=$grid ind=$tblInd cellMar=[$marStr]"
  $ri = 0
  foreach ($tr in $tbl.SelectNodes("w:tr", $ns)) {
    $ri++
    $cantSplit = if ($tr.SelectSingleNode("w:trPr/w:cantSplit", $ns)) { "cantSplit" } else { "" }
    Write-Output "  ROW $ri $cantSplit"
    $ci = 0
    foreach ($tc in $tr.SelectNodes("w:tc", $ns)) {
      $ci++
      $tcW = A ($tc.SelectSingleNode("w:tcPr/w:tcW", $ns)) "w"
      Write-Output "    CELL $ci w=$tcW"
      foreach ($p in $tc.SelectNodes("w:p", $ns)) {
        $line = Show-Para $p
        Write-Output "      $line"
      }
    }
  }
}

$body = $doc.SelectSingleNode("//w:body", $ns)
$i = 0
foreach ($child in $body.ChildNodes) {
  $i++
  if ($child.LocalName -eq "p") {
    Write-Output "[$i] PARA"
    Write-Output ("  " + (Show-Para $child))
  } elseif ($child.LocalName -eq "tbl") {
    Write-Output "[$i] TABLE"
    Show-Table $child
  } else {
    Write-Output "[$i] $($child.LocalName)"
  }
}
Write-Output "SECTPR: $($body.SelectSingleNode('w:sectPr',$ns).OuterXml)"
