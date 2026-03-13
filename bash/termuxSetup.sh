#!/usr/bin/env bash

# КОМАНДЫ ДЛЯ ЗАПУСКА СКРИПТА (НЕОБХОДИМ ИНТЕРНЕТ)
# chmod +x ~/project/dashboardx/bash/termuxSetup.sh
# source ~/project/dashboardx/bash/termuxSetup.sh

# ИНСТАЛЯЦИЯ РЕПОЗИТОРИЕВ
pkg update -y && pkg upgrade -y
pkg install x11-repo -y
pkg update -y && pkg upgrade -y
pkg install root-repo -y
pkg update -y && pkg upgrade -y
pkg install tur-repo -y
pkg update -y && pkg upgrade -y

termux-setup-storage

# ИНСТАЛЯЦИЯ НЕОБХОДИМЫХ ПАКЕТОВ
pkg install nodejs -y
pkg install git -y
pkg install tar -y

# ДОБАВЛЕНИЕ СОКРАЩЕНИЙ
aliases=(
  "alias ll='ls -lah'"
  "alias la='ls -A'"
  
  "alias cls='clear'"
  
  "alias .pd='cd ~/project/dashboardx'"
  "alias ..='cd ..'"
  "alias ...='cd ../..'"
  
  "alias gs='git status'"
  "alias ga='git add .'"
  "alias gc='git commit -m'"
  "alias gp='git push'"
  "alias gl='git log --oneline --graph --all'"
  
  "alias nrps='npm run prod:server'"
  "alias nrpc='npm run prod:client'"
  "alias nrpp='npm run prod'"
  "alias nrds='npm run dev:server'"
  "alias nrdc='npm run dev:client'"
  "alias nrdd='npm run dev'"
  
  "alias ni='npm install'"
  "alias ns='npm start'"
  
  "alias ports='netstat -tulpn'"
  "alias myip='ip a'"
  
  "alias tardb='tar -czpf ~/storage/downloads/termux_backup.tar.gz -C /data/data/com.termux/files home usr'"
  "alias tardr='tar -xzpf ~/storage/downloads/termux_backup.tar.gz -C /data/data/com.termux/files'"
)

bashrc="$HOME/.bashrc"

for i in "${!aliases[@]}"; do
  if [ "$i" -eq 0 ]; then
    echo "${aliases[$i]}" > "$bashrc"
  else
    echo "${aliases[$i]}" >> "$bashrc"
  fi
done

# ПРИМЕНЯЕМ ИЗМЕНЕНИЯ В .bashrc
source ~/.bashrc