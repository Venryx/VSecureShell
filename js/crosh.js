// Copyright (c) 2012 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

lib.rtdep('lib.f',
          'hterm');

// CSP means that we can't kick off the initialization from the html file,
// so we do it like this instead.
window.onload = function() {
  lib.init(Crosh.init);
};

/**
 * The Crosh-powered terminal command.
 *
 * This class defines a command that can be run in an hterm.Terminal instance.
 * The Crosh command uses terminalPrivate extension API to create and use crosh
 * process on Chrome OS machine.
 *
 *
 * @param {Object} argv The argument object passed in from the Terminal.
 */
function Crosh(argv) {
  this.argv_ = argv;
  this.io = null;
  this.keyboard_ = null;
  this.pid_ = -1;
};

/**
 * The extension id of "crosh_builtin", the version of crosh that ships with
 * the Chromium OS system image.
 *
 * See https://chromium.googlesource.com/chromiumos/platform/assets/+/master/
 * chromeapps/crosh_builtin/
 */
Crosh.croshBuiltinId = 'nkoccljplnhpfnfiajclkommnmllphnl';

/**
 * Static initializer called from crosh.html.
 *
 * This constructs a new Terminal instance and instructs it to run the Crosh
 * command.
 */
Crosh.init = function() {
  var profileName = lib.f.parseQuery(document.location.search)['profile'];
  var terminal = new hterm.Terminal(profileName);

  terminal.decorate(document.querySelector('#terminal'));
  terminal.onTerminalReady = function() {
    terminal.keyboard.bindings.addBinding('Ctrl-Shift-P', function() {
      nassh.openOptionsPage();
      return hterm.Keyboard.KeyActions.CANCEL;
    });

    terminal.setCursorPosition(0, 0);
    terminal.setCursorVisible(true);
    terminal.runCommandClass(Crosh, document.location.hash.substr(1));

    terminal.command.keyboard_ = terminal.keyboard;
  };

  // Useful for console debugging.
  window.term_ = terminal;
  console.log(nassh.msg(
      'CONSOLE_CROSH_OPTIONS_NOTICE',
      ['Ctrl-Shift-P', lib.f.getURL('/html/nassh_preferences_editor.html')]));

  return true;
};

/**
 * The name of this command used in messages to the user.
 *
 * Perhaps this will also be used by the user to invoke this command, if we
 * build a shell command.
 */
Crosh.prototype.commandName = 'crosh';

/**
 * Called when an event from the crosh process is detected.
 *
 * @param pid Process id of the process the event came from.
 * @param type Type of the event.
 *             'stdout': Process output detected.
 *             'exit': Process has exited.
 * @param text Text that was detected on process output.
**/
Crosh.prototype.onProcessOutput_ = function(pid, type, text) {
  if (this.pid_ == -1 || pid != this.pid_)
    return;

  if (type == 'exit') {
    this.exit(0);
    return;
  }
  this.io.print(text);
}

/**
 * Start the crosh command.
 *
 * This is invoked by the terminal as a result of terminal.runCommandClass().
 */
Crosh.prototype.run = function() {
  croshInstance = this;
  
  this.io = this.argv_.io.push();

  if (!chrome.terminalPrivate) {
    this.io.println("Crosh is not supported on this version of Chrome.");
    this.exit(1);
    return;
  }

  this.io.onVTKeystroke = this.io.sendString = this.sendString_.bind(this);

  this.io.onTerminalResize = this.onTerminalResize_.bind(this);
  chrome.terminalPrivate.onProcessOutput.addListener(
      this.onProcessOutput_.bind(this));
  document.body.onunload = this.close_.bind(this);
  chrome.terminalPrivate.openTerminalProcess(this.commandName, (pid) => {
    if (pid == undefined || pid == -1) {
      this.io.println("Opening crosh process failed.");
      this.exit(1);
      return;
    }

    window.onbeforeunload = this.onBeforeUnload_.bind(this);
    this.pid_ = pid;

    if (!chrome.terminalPrivate.onTerminalResize) {
      console.warn("Terminal resizing not supported.");
      return;
    }

    // Setup initial window size.
    this.onTerminalResize_(this.io.terminal_.screenSize.width,
                           this.io.terminal_.screenSize.height);

    setTimeout(StartCustom, 1000);
  });
};

// custom
var croshInstance;
function Type(str) {
  for (let ch of str) {
    //this.io.onVTKeystroke(ch);
    croshInstance.io.sendString(ch);
  }
}
function StartCustom() {
  // intercept typing
  /*let onVTKeystroke_old = this.io.onVTKeystroke;
  this.io.onVTKeystroke = function() {
      let result = onVTKeystroke_old.apply(this, arguments);
      //alert(new Error().stack);
      //alert("SendString:" + JSON.stringify(arguments));
      return result;
  };*/

  // intercept printing
  let print_old = croshInstance.io.print;
  croshInstance.io.print = function(text) {
      let result = print_old.apply(this, arguments);
      window.outputText += text;
      return result;
  };

  Type(`shell\r`);
  Type(`sudo edit-chroot -a\r`);
  setTimeout(()=> {
    //let outputLines = window.outputText.substr(window.outputText.indexOf("crosh>")).replace(/\r/g, "").split("\n\n");
    let outputLines = window.outputText.replace(/\r/g, "").split("\n");
    let chroots = outputLines[3].split(" "); // "chroot1 chroot2" -> ["chroot1", "chroot2"]
    RefreshUI(chroots);
  }, 500);
}

function RefreshUI(chroots) {
  var toolbar = document.createElement("div");
  toolbar.id = "toolbar";
  Object.assign(toolbar.style, {position: "absolute", left: 0, top: 0, right: 0});
  toolbar.style.height = "30px";
  toolbar.style.backgroundColor = "rgba(255,255,255,.3)";
  //document.querySelector("iframe").contentDocument.body.prepend(toolbar);
  document.querySelector("#terminal").prepend(toolbar);

  //document.querySelector("iframe").contentDocument.getElementById("hterm:row-nodes").style.marginTop = "30px";
  document.querySelector("iframe").style.top = "30px";
  document.querySelector("iframe").style.height = "calc(100% - 30px)";

  for (let chroot of chroots) {
    var button = document.createElement("button");
    button.innerText = "Start " + chroot;
    button.onclick = ()=> {
      //Type("sudo enter-chroot -n " + chroot + "\r");
      // we don't know what target the chroot has, so just try all three
      Type("sudo starte17 -n " + chroot + "\r");
      Type("sudo startkde -n " + chroot + "\r");
      Type("sudo startxfce4 -n " + chroot + "\r");
    };
    toolbar.appendChild(button);
  }
}

Crosh.prototype.onBeforeUnload_ = function(e) {
  var msg = 'Closing this tab will exit crosh.';
  e.returnValue = msg;
  return msg;
};

/**
 * Used by {@code this.sendString_} to determine if a string should be UTF-8
 * decoded to UTF-16 before sending it to {@code chrome.terminalPrivate}.
 * The string should be decoded if it came from keyboard with 'utf-8' character
 * encoding. The reason is that the extension system expects strings it handles
 * to be UTF-16 encoded.
 *
 * @private
 *
 * @param {string} string A string that may be UTF-8 encoded.
 *
 * @return {string} If decoding is needed, the decoded string, otherwise the
 *     original string.
 */
Crosh.prototype.decodeUTF8IfNeeded_ = function(string) {
  if (this.keyboard_ && this.keyboard_.characterEncoding == 'utf-8')
    return lib.decodeUTF8(string);
  else
    return string;
};

/**
 * Send a string to the crosh process.
 *
 * @param {string} string The string to send.
 */
Crosh.prototype.sendString_ = function(string) {
  if (this.pid_ == -1)
    return;
  chrome.terminalPrivate.sendInput(
      this.pid_,
      this.decodeUTF8IfNeeded_(string));
};

/**
 * Closes crosh terminal and exits the crosh command.
**/
Crosh.prototype.close_ = function() {
    if (this.pid_ == -1)
      return;
    chrome.terminalPrivate.closeTerminalProcess(this.pid_);
    this.pid_ = -1;
}

/**
 * Notify process about new terminal size.
 *
 * @param {string|integer} terminal width.
 * @param {string|integer} terminal height.
 */
Crosh.prototype.onTerminalResize_ = function(width, height) {
  if (this.pid_ == -1)
    return;

  // We don't want to break older versions of chrome.
  if (!chrome.terminalPrivate.onTerminalResize)
    return;

  chrome.terminalPrivate.onTerminalResize(this.pid_,
      Number(width), Number(height),
      function(success) {
        if (!success)
          console.warn("terminalPrivate.onTerminalResize failed");
      }
  );
};

/**
 * Exit the crosh command.
 */
Crosh.prototype.exit = function(code) {
  this.close_();
  window.onbeforeunload = null;

  if (code == 0) {
    this.io.pop();
    if (this.argv_.onExit)
      this.argv_.onExit(code);
    return;
  }

  this.io.println('crosh exited with code: ' + code);
  this.io.println('(R)e-execute, (C)hoose another connection, or E(x)it?');
  this.io.onVTKeystroke = (string) => {
    var ch = string.toLowerCase();
    if (ch == 'r' || ch == ' ' || ch == '\x0d' /* enter */ ||
        ch == '\x12' /* ctrl-r */) {
      document.location.reload();
      return;
    }

    if (ch == 'c') {
      document.location = '/html/nassh.html';
      return;
    }

    if (ch == 'e' || ch == 'x' || ch == '\x1b' /* ESC */ ||
        ch == '\x17' /* C-w */) {
      this.io.pop();
      if (this.argv_.onExit)
        this.argv_.onExit(code);
    }
  };
};
