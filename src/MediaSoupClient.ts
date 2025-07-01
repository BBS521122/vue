import * as mediasoupClient from 'mediasoup-client';

export interface MeetingConfig {
    roomId: string;
    isCreator: boolean;
    serverUrl: string;
}

export interface Message {
    id: string;
    peerId: string;
    content: string;
    timestamp: string;
    isCreator: boolean;
}

export class MediaSoupClientService {
    private device: mediasoupClient.Device | null = null;
    private sendTransport: any = null;
    private recvTransport: any = null;
    private producers: Map<string, any> = new Map();
    private consumers: Map<string, any> = new Map();
    private ws: WebSocket | null = null;
    private serverUrl: string = '';
    private roomId: string = '';
    private isCreator: boolean = false;
    private peerId: string = '';

    // 事件回调
    private onNewConsumer?: (consumer: any, peerId: string) => void;
    private onConsumerClosed?: (consumerId: string) => void;
    private onNewMessage?: (message: Message) => void;
    private onUserJoined?: (peerId: string, isCreator: boolean) => void;
    private onUserLeft?: (peerId: string) => void;
    private onRecordingStarted?: (data: any) => void;
    private onRecordingStopped?: (data: any) => void;
    private onMuteStatusChanged?: (muteAll: boolean) => void;
    private onMainVideoChanged?: (producerId: string) => void;

    constructor() {
        this.device = new mediasoupClient.Device();
    }

    // 设置事件监听器
    setEventListeners(listeners: {
        onNewConsumer?: (consumer: any, peerId: string) => void;
        onConsumerClosed?: (consumerId: string) => void;
        onNewMessage?: (message: Message) => void;
        onUserJoined?: (peerId: string, isCreator: boolean) => void;
        onUserLeft?: (peerId: string) => void;
        onRecordingStarted?: (data: any) => void;
        onRecordingStopped?: (data: any) => void;
        onMuteStatusChanged?: (muteAll: boolean) => void;
        onMainVideoChanged?: (producerId: string) => void;
    }) {
        Object.assign(this, listeners);
    }

    // 初始化设备
    async initDevice() {
        try {
            const response = await fetch(`${this.serverUrl}/api/rtpCapabilities`);
            const responseText = await response.text();
            const rtpCapabilities = JSON.parse(responseText);
            await this.device!.load({routerRtpCapabilities: rtpCapabilities});

        } catch (error) {
            console.error('设备初始化失败:', error);
            if (error instanceof Error) {
                console.error('错误信息:', error.message);
                console.error('错误堆栈:', error.stack);
            }
            throw error;
        }
    }

    // 连接到会议
    async connect(config: MeetingConfig) {
        this.serverUrl = config.serverUrl;
        this.roomId = config.roomId;
        this.isCreator = config.isCreator;

        try {
            // 初始化设备
            await this.initDevice();

            // 建立WebSocket连接
            await this.connectWebSocket();

            // 创建传输
            await this.createTransports();

            // 加入房间
            this.sendWebSocketMessage({
                type: 'joinRoom',
                id: this.roomId,
                isCreator: this.isCreator
            });

            console.log('成功连接到会议');
        } catch (error) {
            console.error('连接会议失败:', error);
            throw error;
        }
    }

    // 建立WebSocket连接
    private async connectWebSocket(): Promise<void> {
        return new Promise((resolve, reject) => {
            const wsUrl = this.serverUrl.replace('http', 'ws');
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket连接已建立');
                resolve();
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.ws.onclose = () => {
                console.log('WebSocket连接已关闭');
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket连接错误:', error);
                reject(error);
            };
        });
    }

    // 处理WebSocket消息
    private async handleWebSocketMessage(data: any) {
        switch (data.type) {
            case 'connected':
                this.peerId = data.peerId;
                break;
            case 'roomJoined':
                console.log('成功加入房间');
                break;
            case 'userJoined':
                this.onUserJoined?.(data.peerId, data.isCreator);
                break;
            case 'userLeft':
                this.onUserLeft?.(data.peerId);
                break;
            case 'newMessage':
                this.onNewMessage?.(data.message);
                break;
            case 'recordingStarted':
                this.onRecordingStarted?.(data);
                break;
            case 'recordingStopped':
                this.onRecordingStopped?.(data);
                break;
            case 'muteStatusChanged':
                this.onMuteStatusChanged?.(data.muteAll);
                break;
            case 'mainVideoChanged':
                this.onMainVideoChanged?.(data.producerId);
                break;
            case 'newProducer':
                await this.consume(data.producerId, data.peerId);
                break;
            case 'error':
                console.error('服务器错误:', data.message);
                break;
        }
    }

    // 发送WebSocket消息
    private sendWebSocketMessage(message: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    // 创建传输
    private async createTransports() {
        // 创建发送传输
        const sendTransportResponse = await fetch(`${this.serverUrl}/api/createWebRtcTransport`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({producing: true, consuming: false})
        });
        const sendTransportData = await sendTransportResponse.json();

        this.sendTransport = this.device!.createSendTransport({
            id: sendTransportData.id,
            iceParameters: sendTransportData.iceParameters,
            iceCandidates: sendTransportData.iceCandidates,
            dtlsParameters: sendTransportData.dtlsParameters
        });

        this.sendTransport.on('connect', async ({dtlsParameters}: {
            dtlsParameters: any
        }, callback: () => void, errback: (error: any) => void) => {
            try {
                await fetch(`${this.serverUrl}/api/connectTransport`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        transportId: this.sendTransport!.id,
                        dtlsParameters
                    })
                });
                callback();
            } catch (error) {
                errback(error);
            }
        });


        this.sendTransport.on('produce', async ({kind, rtpParameters, appData}: {
            kind: string;
            rtpParameters: any;
            appData: any
        }, callback: (data: { id: string }) => void, errback: (error: any) => void) => {
            try {
                const response = await fetch(`${this.serverUrl}/api/produce`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        transportId: this.sendTransport!.id,
                        kind,
                        rtpParameters,
                        appData
                    })
                });
                const {id} = await response.json();
                callback({id});
            } catch (error) {
                errback(error);
            }
        });

        // 创建接收传输
        const recvTransportResponse = await fetch(`${this.serverUrl}/api/createWebRtcTransport`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({producing: false, consuming: true})
        });
        const recvTransportData = await recvTransportResponse.json();

        this.recvTransport = this.device!.createRecvTransport({
            id: recvTransportData.id,
            iceParameters: recvTransportData.iceParameters,
            iceCandidates: recvTransportData.iceCandidates,
            dtlsParameters: recvTransportData.dtlsParameters
        });

        this.recvTransport.on('connect', async ({dtlsParameters}: {
            dtlsParameters: any
        }, callback: () => void, errback: (error: any) => void) => {
            try {
                await fetch(`${this.serverUrl}/api/connectTransport`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        transportId: this.recvTransport!.id,
                        dtlsParameters
                    })
                });
                callback();
            } catch (error) {
                errback(error);
            }
        });
    }

    // 开始生产媒体流
    async produce(track: MediaStreamTrack, appData: any = {}) {
        if (!this.sendTransport) {
            throw new Error('发送传输未初始化');
        }

        const producer = await this.sendTransport.produce({
            track,
            appData
        });

        this.producers.set(producer.id, producer);
        return producer;
    }

    // 消费媒体流
    async consume(producerId: string, peerId: string) {
        if (!this.recvTransport || !this.device) {
            throw new Error('接收传输或设备未初始化');
        }

        const response = await fetch(`${this.serverUrl}/api/consume`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                transportId: this.recvTransport.id,
                producerId,
                rtpCapabilities: this.device.rtpCapabilities
            })
        });

        const consumerData = await response.json();

        const consumer = await this.recvTransport.consume({
            id: consumerData.id,
            producerId: consumerData.producerId,
            kind: consumerData.kind,
            rtpParameters: consumerData.rtpParameters
        });

        this.consumers.set(consumer.id, consumer);

        // 恢复消费者
        await fetch(`${this.serverUrl}/api/resumeConsumer`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({consumerId: consumer.id})
        });

        this.onNewConsumer?.(consumer, peerId);
        return consumer;
    }

    // 发送消息
    sendMessage(content: string) {
        this.sendWebSocketMessage({
            type: 'sendMessage',
            content
        });
    }

    // 禁言/解除禁言
    muteAll(mute: boolean) {
        if (!this.isCreator) return;

        this.sendWebSocketMessage({
            type: 'muteUser',
            mute
        });
    }

    // 切换主视频
    switchMainVideo(producerId: string) {
        if (!this.isCreator) return;

        this.sendWebSocketMessage({
            type: 'switchMainVideo',
            producerId
        });
    }

    // 开始录制
    startRecording() {
        if (!this.isCreator) return;

        this.sendWebSocketMessage({
            type: 'startRecording'
        });
    }

    // 停止录制
    stopRecording() {
        if (!this.isCreator) return;

        this.sendWebSocketMessage({
            type: 'stopRecording'
        });
    }

    // 断开连接
    disconnect() {
        // 关闭所有生产者
        this.producers.forEach(producer => producer.close());
        this.producers.clear();

        // 关闭所有消费者
        this.consumers.forEach(consumer => consumer.close());
        this.consumers.clear();

        // 关闭传输
        this.sendTransport?.close();
        this.recvTransport?.close();

        // 关闭WebSocket
        if (this.ws) {
            this.sendWebSocketMessage({type: 'leaveRoom'});
            this.ws.close();
        }

        console.log('已断开会议连接');
    }
}

export default MediaSoupClientService;

