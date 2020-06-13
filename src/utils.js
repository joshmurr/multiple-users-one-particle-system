export function detectBrowser(){
    // https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
    if((!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) return 'opera';
    else if(typeof InstallTrigger !== 'undefined') return 'firefox';
    else if(/constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification))) return 'safari';
    else if(/*@cc_on!@*/false || !!document.documentMode) return 'ie';
    else if(/* !isIE &&  */!!window.StyleMedia) return 'edge';
    else if(!!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime)) return 'chrome';
    else if(navigator.userAgent.indexOf("Edg") != -1) return 'edgeChromium';
    else if(!!window.CSS) return 'blink';
}
