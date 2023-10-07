# overlaytools

ApexLegends のカスタムマッチ用オーバーレイツール。  
リーダーボードやチーム名、プレイヤー名、アイテム数などの表示を行う。

![image](https://github.com/ndekopon/overlaytools/assets/92087784/ad3d606b-e488-4755-9ada-aebd3a677d40)
![image](https://github.com/ndekopon/overlaytools/assets/92087784/3665c1e7-6546-44b0-ad5d-bfe5eb51983a)

## 概要

ApexLegendsからWebSocket経由でLiveAPIデータを取得し、WebブラウザとWebSocket経由でそのデータをやり取りするプログラム。  
OBSにブラウザソースがあるので、それを使ってカスタムマッチ用のオーバーレイを表示する。


## 必要環境

OS
- Windows10 (x64)
- Windows11 (x64)

ApexLegendsクライアント言語(アイテム関連)
- English
- 日本語

## 使い方

[Releases](https://github.com/ndekopon/overlaytools/releases) のAsseetsの中にある `overlaytools_YYYYmmdd.zip` をダウンロードする。

以下のページに利用手順を記載。
- [利用手順](https://gist.github.com/ndekopon/641acca44ef4f98b6e70ec46b3bf296b)

## 特徴

リモートのサーバーを介さずローカルのみで完結。  
以下の機能がある。

- オーバーレイ
    - リーダーボード
    - チームバナー
    - プレーヤーバナー
    - アイテム所持数表示
    - チームキル数
    - 現在のゲーム数
    - チャンピオンチーム名表示
- チームデスマッチ用オーバーレイ
    - スコアボード
- 管理画面
    - リアルタイム表示(カメラ切り替え用)
    - リザルト確認
    - チャット入力

Webサーバーが必要なので、別リポジトリに[httpserver](https://github.com/ndekopon/httpserver)を作って同梱。

## 作者

- [nDekopon(X)](https://twitter.com/ndekopon)

## ライセンス

- [MIT](https://github.com/ndekopon/overlaytools/blob/main/LICENSE)
