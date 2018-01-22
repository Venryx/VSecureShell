let chromebookID = 0;

window.config = {
    /*activateSudo: true,
    sudoPassword: "\\",*/
    chrootCommands: false,
    commands: [
        {name: "Start linux", command: "sudo startxfce4"},
        {
            name: "Start input assistant",
            command:
`shell
#adb connect 100.115.92.2
sudo enter-chroot -n xenial
echo \\\\ | sudo -S bash
${chromebookID == 0
    ? `sudo /home/venryx/.nvm/versions/node/v9.2.0/bin/node "/home/venryx/Downloads/Root/Apps/@V/Input Assistant/Main/Main.js"`
    : `sudo /home/davey/.nvm/versions/node/v9.2.0/bin/node "/home/davey/Downloads/Root/Apps/Games/InputAssistant/Main.js"`}
`
        },
    ],
};