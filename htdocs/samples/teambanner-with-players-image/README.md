# teambanner-with-players-image

プレイヤーのイメージを定義して、カメラ切替に連動して表示するサンプル。
チームバナーとして表示する。

![image](https://github.com/user-attachments/assets/35f41e13-da66-4a0d-964e-c2eb9538712d)

## 使い方

1. `custom-overlays`内のファイルを`htdocs/custom-overlays`フォルダにコピーする。
2. `player-images`フォルダを`htdocs`フォルダにコピーする。
3. `htdocs/custom-overlays/teambanner-append.css`にカスタムマッチ参加者分の名前・画像の紐づけを行う。(画像が定義されていない場合、`player-images/player-default.png`が表示される

### 名前と画像の定義(teambanner-append.css)

`testplayer01`という名前のプレイヤー用に`player-images/player-01.png`の画像を表示する例

```css
.playerimage[data-cameraplayer-name="testplayer01"] {
    background-image: url('player-images/player-01.png');
}
```
