# overlaytools

ApexLegends のカスタムマッチ向けオーバーレイツール。  
大会を開いた際に、配信上の神視点画面にリアルタイム順位やチーム名、プレイヤー名、所有アイテム数などの表示を行う。  


![リーダーボード](https://github.com/ndekopon/overlaytools/assets/92087784/ad3d606b-e488-4755-9ada-aebd3a677d40)
![アイテム数](https://github.com/ndekopon/overlaytools/assets/92087784/3665c1e7-6546-44b0-ad5d-bfe5eb51983a)
![リザルト](https://github.com/ndekopon/overlaytools/assets/92087784/b06ccc4e-476b-452e-98ab-3260bd5aa429)

## 概要

ApexLegendsからWebSocket経由でLiveAPIデータを取得し、WebブラウザとWebSocket経由でそのデータをやり取りするプログラム。  
OBSのソースにあるブラウザを利用してカスタムマッチ用のオーバーレイパーツを表示する。


## 必要環境

OS
- Windows10 (x64)
- Windows11 (x64)

ApexLegendsクライアント言語(アイテム関連)
- English
- 日本語

WebView2(基本的にインストール済)
- [WebView2 ダウンロード](https://developer.microsoft.com/ja-jp/microsoft-edge/webview2/consumer/)

## 使い方

以下のページに利用手順を記載。
- [利用手順(Wiki)](https://github.com/ndekopon/overlaytools/wiki)

## 特徴

外部にあるサーバーなどへの接続は行わず、神視点を行うプレイヤーのPCのみで利用可能。  
以下の機能がある。

- オーバーレイ
    - リーダーボード(リアルタイム順位表)
    - チームバナー
    - プレーヤーバナー
    - アイテム所持数表示
    - チームキル数
    - 現在のゲーム数
    - チャンピオンチーム名表示
    - チーム排除情報表示
- チームデスマッチ用オーバーレイ
    - スコアボード
- 管理画面
    - リアルタイム表示(カメラ切り替え用)
    - リザルト確認
    - チャット入力

## 作者

- [nDekopon(X)](https://twitter.com/ndekopon)

## ライセンス

- [MIT](https://github.com/ndekopon/overlaytools/blob/main/LICENSE)
