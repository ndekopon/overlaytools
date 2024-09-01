# teambanner-with-teamimage

チーム用のイメージを定義して、カメラ切替に連動して表示するサンプル。
チームバナーとして表示する。


## 使い方

1. `custom-overlays`内のファイルを`htdocs/custom-overlays`フォルダにコピーする。
2. `team-images`フォルダを`htdocs`フォルダにコピーする。
3. `htdocs/team-images`フォルダに各チーム用画像を配置する。
4. `htdocs/custom-overlays/teambanner-append.css`にカスタムマッチ参加チームの名前・画像の紐づけを行う。(画像が定義されていない場合、`team-images/team-default.png`が表示される)

### 名前と画像の定義(teambanner-append.css)

`testteam01`という名前のチーム用に`team-images/team-01.png`の画像を表示する例

```css
.teamimage[data-camera-team-name="testteam01"] {
    background-image: url('team-images/team-01.png');
}
```
