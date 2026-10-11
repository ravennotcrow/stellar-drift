export const CSS = `
.sd-root{position:absolute;inset:0;overflow:hidden;background:#05070f;color:#e8eefc;
  font-family:var(--font,system-ui);user-select:none;-webkit-user-select:none;
  -webkit-tap-highlight-color:transparent}
.sd-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.sd-hud{position:absolute;left:0;right:0;top:0;display:flex;flex-wrap:wrap;gap:6px;
  padding:calc(8px + var(--mobius-safe-top,0px)) 10px 8px;pointer-events:none}
.sd-chip{background:rgba(12,18,34,.78);border:1px solid rgba(120,150,210,.28);
  border-radius:10px;padding:4px 9px;font-size:12px;line-height:1.3;backdrop-filter:blur(6px)}
.sd-chip .en{opacity:.6;font-size:11px}
.sd-chip.warn{border-color:rgba(255,150,90,.6);color:#ffc59b}
.sd-bar{display:block;width:64px;height:4px;border-radius:3px;background:rgba(255,255,255,.16);margin-top:3px}
.sd-bar i{display:block;height:100%;border-radius:3px;background:#6fd3ff}
.sd-banner{position:absolute;left:50%;top:calc(46px + var(--mobius-safe-top,0px));transform:translateX(-50%);
  background:rgba(10,16,30,.9);border:1px solid rgba(150,180,240,.35);border-radius:12px;
  padding:8px 14px;font-size:14px;text-align:center;max-width:88%;pointer-events:none;animation:sd-fade .3s ease}
.sd-banner .en{display:block;opacity:.6;font-size:12px;margin-top:2px}
@keyframes sd-fade{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1}}
.sd-pad{position:absolute;right:14px;bottom:calc(14px + var(--mobius-safe-bottom,0px));
  display:grid;grid-template-columns:repeat(2,minmax(64px,1fr));gap:8px}
.sd-btn{min-height:52px;min-width:64px;border-radius:12px;border:1px solid rgba(130,165,230,.4);
  background:rgba(18,26,46,.86);color:#eaf1ff;font-size:14px;font-weight:600;padding:4px 6px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;touch-action:none}
.sd-btn .en{font-weight:400;opacity:.6;font-size:10px}
.sd-btn:active,.sd-btn.on{background:rgba(70,120,220,.75);border-color:#8fb6ff}
.sd-drill{position:absolute;left:14px;bottom:calc(14px + var(--mobius-safe-bottom,0px));
  width:78px;height:78px;border-radius:50%;border:1px solid rgba(255,190,120,.5);
  background:rgba(46,30,18,.85);color:#ffd9a8;font-size:13px;font-weight:600;touch-action:none;
  display:flex;flex-direction:column;align-items:center;justify-content:center}
.sd-drill.on{background:rgba(230,140,60,.85);color:#1b0f04}
.sd-panel{position:absolute;inset:auto 0 0 0;background:rgba(8,12,24,.96);
  border-top:1px solid rgba(130,165,230,.35);padding:14px 14px calc(14px + var(--mobius-safe-bottom,0px));
  max-height:74%;overflow:auto;animation:sd-up .22s ease}
@keyframes sd-up{from{transform:translateY(14px);opacity:.4}to{transform:none;opacity:1}}
.sd-panel h2{margin:0 0 10px;font-size:16px}
.sd-panel h2 .en{font-size:12px;opacity:.6;font-weight:400}
.sd-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.sd-act{flex:1 1 140px;min-height:48px;border-radius:10px;border:1px solid rgba(130,165,230,.4);
  background:rgba(20,30,54,.9);color:#eaf1ff;font-size:13px;padding:8px 10px;text-align:left}
.sd-act .en{display:block;opacity:.6;font-size:11px}
.sd-act:disabled{opacity:.4}
.sd-mission{border:1px solid rgba(150,220,160,.4);border-radius:10px;padding:10px;margin-bottom:10px;font-size:14px}
.sd-mission .en{opacity:.6;font-size:12px}
.sd-close{position:absolute;right:12px;top:12px;width:36px;height:36px;border-radius:50%;
  border:1px solid rgba(130,165,230,.4);background:rgba(20,30,54,.9);color:#eaf1ff;font-size:16px}
.sd-vocab{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.sd-vocab span{font-size:11px;padding:2px 6px;border-radius:6px;background:rgba(255,255,255,.06)}
.sd-vocab span.m{background:rgba(110,220,160,.18)}
.sd-hint{opacity:.55;font-size:11px;margin-top:8px}
.sd-help{margin:0;padding-left:18px;font-size:13px;line-height:1.5}
.sd-help li{margin-bottom:7px}
.sd-help b{color:#fff}
.sd-vocab em{opacity:.6;font-style:normal}
.sd-hold{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
.sd-hold-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid rgba(130,165,230,.25);border-radius:10px;padding:8px 10px}
.sd-hold-name{font-size:14px;min-width:92px}
.sd-hold-value{font-size:12px;opacity:.85}
.sd-hold-acts{display:flex;gap:6px;margin-left:auto}
.sd-mini{min-height:36px;border-radius:8px;border:1px solid rgba(130,165,230,.4);background:rgba(20,30,54,.9);color:#eaf1ff;font-size:12px;padding:4px 9px;display:flex;align-items:center;gap:4px}
.sd-mini:disabled{opacity:.35}
.sd-mini .en{opacity:.6;font-size:10px}
.sd-scene{position:absolute;inset:0;background:linear-gradient(180deg,#0b1222,#05070f 60%);
  padding:calc(58px + var(--mobius-safe-top,0px)) 16px calc(18px + var(--mobius-safe-bottom,0px));
  display:flex;flex-direction:column;gap:12px;overflow:auto}
.sd-scene h2{margin:0;font-size:18px}
.sd-patron{font-size:15px;font-weight:650;color:#cfe0ff}
.sd-say{font-size:20px;line-height:1.35;padding:14px 16px;border-radius:12px;
  background:rgba(30,46,80,.92);border:1px solid rgba(150,185,255,.5);border-left:4px solid #7fe0c0}
.sd-say .en{display:block;font-size:13px;opacity:.6;margin-top:4px}
.sd-options{display:flex;flex-direction:column;gap:8px;margin-top:2px}
.sd-options .sd-act{flex:0 0 auto;min-height:52px;font-size:15px;background:rgba(16,24,44,.85)}
.sd-shift{height:6px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden}
.sd-shift i{display:block;height:100%;background:#7fe0c0}
.sd-systems{display:flex;flex-direction:column;gap:8px}
.sd-system{display:flex;align-items:center;gap:12px;flex-wrap:wrap;min-height:58px;
  border-radius:12px;border:1px solid rgba(130,165,230,.35);background:rgba(18,26,46,.85);
  color:#eaf1ff;font-size:16px;padding:10px 14px;text-align:left}
.sd-system.sel{border-color:#8fb6ff;background:rgba(44,66,120,.9)}
.sd-system.off{opacity:.45}
.sd-system-name{font-weight:650}
.sd-system-state{opacity:.85}
.sd-system-clock{flex:1 1 80px;height:5px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden;min-width:60px}
.sd-system-clock i{display:block;height:100%;background:#ffb27a}
.sd-contract{border:1px solid rgba(150,220,160,.4);border-radius:10px;padding:10px;font-size:14px}
.sd-gloss{display:block;opacity:.6;font-size:11px;margin-top:3px}
.sd-bay{position:relative;margin:2px 0 4px}
.sd-cell{position:absolute;border-radius:8px;border:1px solid rgba(130,165,230,.22);background:rgba(255,255,255,.035);padding:0}
.sd-cell.ok{border-color:#8fb6ff;background:rgba(80,130,230,.3)}
.sd-layer{position:absolute;inset:0;pointer-events:none}
.sd-block{position:absolute;border-radius:8px;border:1px solid rgba(150,185,255,.55);
  background:rgba(46,70,130,.95);display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:1px;font-size:10px;font-weight:600;color:#eaf1ff;overflow:hidden;
  text-align:center;padding:3px;line-height:1.1;word-break:break-word}
.sd-block .en{opacity:.7;font-size:9px}
.sd-block--crate{background-color:rgba(46,70,130,.5);background-size:76% 76%;
  background-position:center;background-repeat:no-repeat;text-shadow:0 1px 3px rgba(0,0,0,.85)}
.sd-hud{z-index:6}
.sd-hub{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;gap:12px;
  align-items:center;padding:calc(58px + var(--mobius-safe-top,0px)) 16px calc(16px + var(--mobius-safe-bottom,0px));
  background:radial-gradient(120% 110% at 50% 42%,#0a1120 0%,#03060d 72%);overflow:hidden}
.sd-hub-stage{position:relative;width:min(100%,calc((100dvh - 260px) * 1.7778));
  aspect-ratio:16/9;border-radius:18px;overflow:hidden;
  border:1px solid rgba(120,160,225,.3);box-shadow:0 18px 60px rgba(0,0,0,.6);
  flex:0 0 auto}
.sd-hub-svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.sd-doorway{stroke-width:5;stroke-linejoin:round}
.sd-doorway--office{stroke:rgba(140,185,255,.75)}
.sd-doorway--social{stroke:rgba(215,160,235,.75)}
.sd-doorway--work{stroke:rgba(255,178,122,.75)}
.sd-doorway--cargo{stroke:rgba(228,196,140,.75)}
.sd-doorway--market{stroke:rgba(240,200,120,.75)}
.sd-doorway--cards{stroke:rgba(235,120,140,.75)}
.sd-doorway--inspect{stroke:rgba(150,210,235,.75)}
.sd-doorway--news{stroke:rgba(150,235,200,.75)}
:root{--sd-tone-office:rgba(140,185,255,1);--sd-tone-social:rgba(215,160,235,1);
  --sd-tone-work:rgba(255,178,122,1);--sd-tone-cargo:rgba(228,196,140,1);
  --sd-tone-market:rgba(240,200,120,1);--sd-tone-cards:rgba(235,120,140,1);
  --sd-tone-inspect:rgba(150,210,235,1);--sd-tone-news:rgba(150,235,200,1);
  --sd-tone-launch:rgba(127,224,192,1)}
.sd-door{position:absolute;border:0;background:transparent;color:#eaf1ff;
  display:block;border-radius:6px}
.sd-door:active{background:rgba(140,190,255,.13)}
.sd-door-label{position:absolute;top:11%;left:0;right:0;display:flex;flex-direction:column;
  align-items:center;gap:3px;text-shadow:0 2px 9px rgba(0,0,0,.92);pointer-events:none}
.sd-door-name{font-size:17px;font-weight:700;letter-spacing:.01em}
.sd-door-sub{font-size:11px;opacity:.75}
.sd-door--airlock .sd-door-name{color:#bff5e2}
.sd-quick{width:min(100%,760px);display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.sd-mini--quick{flex:1 1 132px;min-height:48px;border-radius:12px;font-size:14px;
  background:linear-gradient(180deg,rgba(30,44,74,.95),rgba(15,23,40,.95));
  border-color:rgba(120,160,225,.4);justify-content:center}
.sd-mini--quick:active{background:linear-gradient(180deg,rgba(52,86,150,.95),rgba(24,40,74,.95))}
.sd-mini--quick:disabled{opacity:.4}
.sd-crates{display:flex;flex-wrap:wrap;gap:6px}
.sd-crate{min-height:44px;border-radius:10px;border:1px solid rgba(130,165,230,.4);
  background:rgba(20,30,54,.9);color:#eaf1ff;font-size:12px;padding:6px 10px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.sd-crate .en{opacity:.55;font-size:10px}
.sd-crate.sel{border-color:#8fb6ff;background:rgba(50,80,150,.95)}
.sd-crate:disabled{opacity:.4}
/* Markt, Kontrolle, Karten, Gazette */
.sd-goods{display:flex;gap:10px;flex-wrap:wrap}
.sd-good{flex:1 1 150px;min-height:116px;border-radius:14px;border:1px solid rgba(130,165,230,.4);
  background:rgba(18,26,46,.88);color:#eaf1ff;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:7px;padding:12px;text-align:center}
.sd-good:active{border-color:#8fb6ff;background:rgba(44,66,120,.9)}
.sd-good-name{font-size:18px;font-weight:700}
.sd-good-price{font-size:13px;opacity:.85}
.sd-good-trend{font-size:12px;opacity:.7}
.sd-tagrow{display:flex;flex-wrap:wrap;gap:6px}
.sd-tag{display:inline-block;padding:4px 10px;border-radius:8px;background:rgba(255,178,122,.16);
  border:1px solid rgba(255,178,122,.45);color:#ffd9a8;font-size:14px}
.sd-boardcard{border:1px solid rgba(130,165,230,.35);border-radius:12px;padding:10px 12px;
  background:rgba(14,20,36,.85)}
.sd-boardhead{font-weight:700;margin-bottom:6px;font-size:14px}
.sd-boardrow{display:flex;gap:12px;align-items:center;padding:5px 0;
  border-top:1px solid rgba(130,165,230,.15);font-size:13px}
.sd-sect{min-width:58px;font-weight:650;letter-spacing:.02em}
.sd-fact{opacity:.85}
.sd-crateclock{height:5px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:8px}
.sd-crateclock i{display:block;height:100%;background:#ffb27a}
.sd-gazrow{display:grid;grid-template-columns:1.3fr 1fr;gap:12px;align-items:start}
@media (max-width:640px){.sd-gazrow{grid-template-columns:1fr}}
.sd-hand{display:flex;flex-wrap:wrap;gap:8px}
.sd-card{min-width:66px;min-height:86px;border-radius:10px;border:1px solid rgba(230,232,250,.4);
  background:linear-gradient(180deg,#f6f2e8,#d8d1bf);color:#22242e;display:flex;align-items:center;
  justify-content:center;font-weight:700;font-size:15px;padding:8px;text-align:center}
.sd-card .en{color:#22242e;opacity:.65}
.sd-total{font-size:26px;font-weight:750;margin:2px 0 4px}
.sd-total .en{font-size:13px;opacity:.55;font-weight:400}
.sd-dealer{opacity:.92}
/* Combat: weapons, power routing */
.sd-weapons{position:absolute;left:50%;transform:translateX(-50%);
  bottom:calc(104px + var(--mobius-safe-bottom,0px));display:flex;gap:8px;flex-wrap:wrap;
  justify-content:center;max-width:min(92%,660px)}
.sd-weapon{position:relative;min-width:104px;min-height:56px;border-radius:12px;
  border:1px solid rgba(255,140,120,.45);background:rgba(40,18,22,.9);color:#ffd9d0;
  font-size:13px;font-weight:600;padding:6px 10px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:2px;overflow:hidden;touch-action:none}
.sd-weapon.on{background:rgba(220,90,70,.9);color:#1b0a06}
.sd-weapon.cold{opacity:.55}
.sd-weapon-ammo{position:absolute;top:3px;right:7px;font-size:10px;opacity:.85}
.sd-weapon-cd{position:absolute;left:0;bottom:0;height:3px;background:#ffb27a}
.sd-power{display:flex;flex-direction:column;gap:8px}
.sd-power-row{display:flex;align-items:center;gap:10px;min-height:52px;border-radius:10px;
  border:1px solid rgba(130,165,230,.4);background:rgba(20,30,54,.9);color:#eaf1ff;
  font-size:15px;padding:8px 12px}
.sd-power-row.sel{border-color:#8fb6ff;background:rgba(44,66,120,.95)}
.sd-power-name{min-width:100px;font-weight:600;text-align:left}
.sd-power-val{width:48px;text-align:right;opacity:.9}
.sd-power-bar{flex:1;height:8px;border-radius:5px;background:rgba(255,255,255,.14);overflow:hidden}
.sd-power-bar i{display:block;height:100%;background:#6fd3ff}
@media (prefers-reduced-motion:reduce){.sd-banner,.sd-panel{animation:none}}
`
