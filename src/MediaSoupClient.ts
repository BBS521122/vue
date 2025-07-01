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

            // 等待 connected 消消息，拿到 peerId 后再创建传输
            await new Promise<void>((resolve) => {
                const originalHandler = this.handleWebSocketMessage.bind(this);
                this.handleWebSocketMessage = async (data: any) => {
                    await originalHandler(data);
                    if (data.type === 'connected') {
                        resolve();
                        // 恢复原有 handler
                        this.handleWebSocketMessage = originalHandler;
                    }
                };
            });

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
        console.log('=== 处理WebSocket消息 ===');
        console.log('消息类型:', data.type);
        console.log('完整消息:', data);
        
        switch (data.type) {
            case 'connected':
                this.peerId = data.peerId;
                console.log('✅ 连接确认，peerId:', this.peerId);
                break;
            case 'roomJoined':
                console.log('✅ 成功加入房间');
                break;
            case 'userJoined':
                console.log('👤 用户加入:', data.peerId, '是否创建者:', data.isCreator);
                this.onUserJoined?.(data.peerId, data.isCreator);
                break;
            case 'userLeft':
                console.log('👤 用户离开:', data.peerId);
                this.onUserLeft?.(data.peerId);
                break;
            case 'newMessage':
                console.log('💬 新消息:', data.message);
                this.onNewMessage?.(data.message);
                break;
            case 'recordingStarted':
                console.log('🔴 录制开始:', data);
                this.onRecordingStarted?.(data);
                break;
            case 'recordingStopped':
                console.log('⏹️ 录制停止:', data);
                this.onRecordingStopped?.(data);
                break;
            case 'muteStatusChanged':
                console.log('🔇 禁言状态变化:', data.muteAll);
                this.onMuteStatusChanged?.(data.muteAll);
                break;
            case 'mainVideoChanged':
                console.log('📺 主视频变化:', data);
                this.onMainVideoChanged?.(data);
                break;
            case 'newProducer':
                console.log('🎬 新生产者:', {
                    producerId: data.producerId,
                    peerId: data.peerId,
                    appData: data.appData,
                    kind: data.kind
                });
                if (data.appData?.type === 'creator-video') {
                    console.log('🎯 这是创建者视频流，准备订阅...');
                    try {
                        await this.consume(data.producerId, data.peerId);
                        console.log('✅ 创建者视频流订阅成功');
                    } catch (error) {
                        console.error('❌ 创建者视频流订阅失败:', error);
                    }
                } else if (data.appData?.type === 'screen') {
                    // 新增：非创建者自动订阅屏幕共享流
                    if (!this.isCreator) {
                        console.log('🖥️ 检测到屏幕共享流，非创建者自动订阅...');
                        try {
                            await this.consume(data.producerId, data.peerId);
                            console.log('✅ 屏幕共享流订阅成功');
                        } catch (error) {
                            console.error('❌ 屏幕共享流订阅失败:', error);
                        }
                    } else {
                        console.log('ℹ️ 创建者收到屏幕共享流，跳过订阅');
                    }
                } else {
                    console.log('ℹ️ 非创建者视频流，跳过订阅');
                }
                break;
            case 'error':
                console.error('❌ 服务器错误:', data.message);
                break;
            default:
                console.warn('⚠️ 未知消息类型:', data.type);
        }
    }

    // 发送WebSocket消息
    sendWebSocketMessage(message: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('📤 发送WebSocket消息:', message);
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('⚠️ WebSocket连接不可用，无法发送消息:', message);
        }
    }

    // 创建传输
    private async createTransports() {
        console.log('=== 创建传输开始 ===');
        console.log('peerId:', this.peerId);
        
        // 创建发送传输
        const sendTransportResponse = await fetch(`${this.serverUrl}/api/createWebRtcTransport`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({producing: true, consuming: false, peerId: this.peerId})
        });
        const sendTransportData = await sendTransportResponse.json();

        console.log('✅ 发送传输数据:', {
            id: sendTransportData.id,
            iceParametersKeys: Object.keys(sendTransportData.iceParameters || {}),
            iceCandidatesCount: sendTransportData.iceCandidates?.length || 0,
            dtlsParametersKeys: Object.keys(sendTransportData.dtlsParameters || {})
        });

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
                console.log('📡 连接发送传输...');
                await fetch(`${this.serverUrl}/api/connectTransport`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        transportId: this.sendTransport!.id,
                        dtlsParameters
                    })
                });
                console.log('✅ 发送传输连接成功');
                callback();
            } catch (error) {
                console.error('❌ 发送传输连接失败:', error);
                errback(error);
            }
        });


        this.sendTransport.on('produce', async ({kind, rtpParameters, appData}: {
            kind: string;
            rtpParameters: any;
            appData: any
        }, callback: (data: { id: string }) => void, errback: (error: any) => void) => {
            try {
                console.log('🎬 开始生产媒体流:', { kind, appData });
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
                console.log('✅ 生产者创建成功，ID:', id);
                callback({id});
            } catch (error) {
                console.error('❌ 生产者创建失败:', error);
                errback(error);
            }
        });

        // 创建接收传输
        const recvTransportResponse = await fetch(`${this.serverUrl}/api/createWebRtcTransport`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({producing: false, consuming: true, peerId: this.peerId})
        });
        const recvTransportData = await recvTransportResponse.json();

        console.log('✅ 接收传输数据:', {
            id: recvTransportData.id,
            iceParametersKeys: Object.keys(recvTransportData.iceParameters || {}),
            iceCandidatesCount: recvTransportData.iceCandidates?.length || 0,
            dtlsParametersKeys: Object.keys(recvTransportData.dtlsParameters || {})
        });

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
                console.log('📡 连接接收传输...');
                await fetch(`${this.serverUrl}/api/connectTransport`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        transportId: this.recvTransport!.id,
                        dtlsParameters
                    })
                });
                console.log('✅ 接收传输连接成功');
                callback();
            } catch (error) {
                console.error('❌ 接收传输连接失败:', error);
                errback(error);
            }
        });
        
        console.log('=== 传输创建完成 ===');
    }

    // 开始生产媒体流
    async produce(track: MediaStreamTrack, appData: any = {}) {
        console.log('=== 开始创建生产者 ===');
        console.log('track kind:', track.kind);
        console.log('track enabled:', track.enabled);
        console.log('track readyState:', track.readyState);
        console.log('appData:', appData);
        
        if (!this.sendTransport) {
            throw new Error('发送传输未初始化');
        }
        
        const producer = await this.sendTransport.produce({
            track,
            appData
        });
        
        console.log('✅ 生产者创建成功:', {
            id: producer.id,
            kind: producer.kind,
            paused: producer.paused,
            appData: producer.appData
        });
        
        this.producers.set(producer.id, producer);
        return producer;
    }

    // 消费媒体流
    async consume(producerId: string, peerId: string) {
        console.log('=== 开始订阅生产者 ===');
        console.log('producerId:', producerId);
        console.log('peerId:', peerId);
        console.log('recvTransport ID:', this.recvTransport?.id);
        console.log('device loaded:', this.device?.loaded);
        
        if (!this.recvTransport || !this.device) {
            console.error('❌ 接收传输或设备未初始化');
            throw new Error('接收传输或设备未初始化');
        }

        console.log('📡 发送消费请求...');
        const response = await fetch(`${this.serverUrl}/api/consume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transportId: this.recvTransport.id,
                producerId,
                rtpCapabilities: this.device.rtpCapabilities
            })
        });

        const consumerData = await response.json();
        console.log('✅ 消费者数据响应:', {
            id: consumerData.id,
            producerId: consumerData.producerId,
            kind: consumerData.kind,
            rtpParametersKeys: Object.keys(consumerData.rtpParameters || {}),
            appData: consumerData.appData // 🔥 关键：记录 appData
        });

        console.log('🔄 创建本地消费者...');
        const consumer = await this.recvTransport.consume({
            id: consumerData.id,
            producerId: consumerData.producerId,
            kind: consumerData.kind,
            rtpParameters: consumerData.rtpParameters,
            appData: consumerData.appData || {} // 🔥 关键修复：将 appData 传递给 consumer
        });
        
        console.log('✅ 消费者创建成功:', {
            id: consumer.id,
            kind: consumer.kind,
            paused: consumer.paused,
            track: !!consumer.track,
            trackId: consumer.track?.id,
            trackEnabled: consumer.track?.enabled,
            trackReadyState: consumer.track?.readyState,
            appData: consumer.appData // 🔥 关键：验证 appData 是否正确设置
        });

        this.consumers.set(consumer.id, consumer);

        console.log('📡 恢复消费者...');
        await fetch(`${this.serverUrl}/api/resumeConsumer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consumerId: consumer.id })
        });

        console.log('✅ 消费者恢复完成，调用回调...');
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

    /**
     * 创建者视频流：创建者发布视频流，非创建者订阅视频流
     * @date 2025-7-1 20:44
     */
    async handleCreatorVideo() {
        console.log('=== 处理创建者视频流 ===');
        console.log('isCreator:', this.isCreator);
        console.log('peerId:', this.peerId);
        
        if (this.isCreator) {
            console.log('👑 创建者模式：上传视频流');
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = videoStream.getVideoTracks()[0];
                
                console.log('📹 获取视频流成功:', {
                    trackId: videoTrack.id,
                    kind: videoTrack.kind,
                    enabled: videoTrack.enabled,
                    readyState: videoTrack.readyState,
                    label: videoTrack.label
                });
                
                await this.produce(videoTrack, { type: 'creator-video' });
                console.log('✅ 创建者视频流发布完成');
            } catch (error) {
                console.error('❌ 创建者视频流处理失败:', error);
                throw error;
            }
        } else {
            console.log('👥 非创建者模式：订阅创建者视频流');
            if (this.ws) {
                console.log('✅ WebSocket已连接，设置消息监听器');
                // 保存原来的onmessage，避免覆盖
                const originalOnMessage = this.ws.onmessage;
                
                this.ws.onmessage = async (event) => {
                    const data = JSON.parse(event.data);
                    console.log('📨 非创建者接收到消息:', {
                        type: data.type,
                        data: data
                    });
                    
                    // 调用原来的消息处理器
                    if (originalOnMessage && this.ws) {
                        originalOnMessage.call(this.ws, event);
                    }
                    
                    // 额外处理newProducer消息
                    if (data.type === 'newProducer' && data.appData?.type === 'creator-video') {
                        console.log('🎬 发现创建者视频生产者:', {
                            producerId: data.producerId,
                            peerId: data.peerId,
                            appData: data.appData
                        });
                        try {
                            await this.consume(data.producerId, data.peerId);
                            console.log('✅ 成功订阅创建者视频流');
                        } catch (error) {
                            console.error('❌ 订阅创建者视频流失败:', error);
                        }
                    }
                };
            } else {
                console.error('❌ WebSocket 未初始化');
            }
        }
    }

    // 切换主视频
    switchMainVideo(data: { mainStreamId?: string, secondaryStreamId?: string, producerId?: string }) {
        if (!this.isCreator) {
            console.log('⚠️ 非创建者无法切换主视频');
            return;
        }

        console.log('📺 创建者发送主视频切换请求:', data);
        this.sendWebSocketMessage({
            type: 'switchMainVideo',
            ...data
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

    // 关闭屏幕共享生产者
    async closeScreenProducers() {
        console.log('=== 关闭屏幕共享生产者 ===');
        const screenProducers = [];
        
        for (const [producerId, producer] of this.producers) {
            if (producer.appData?.type === 'screen' || producer.appData?.type === 'screen-audio') {
                console.log('🔄 找到屏幕共享生产者:', {
                    id: producerId,
                    kind: producer.kind,
                    type: producer.appData?.type
                });
                screenProducers.push(producerId);
            }
        }
        
        for (const producerId of screenProducers) {
            const producer = this.producers.get(producerId);
            if (producer) {
                console.log('⏹️ 关闭生产者:', producerId);
                producer.close();
                this.producers.delete(producerId);
            }
        }
        
        console.log('✅ 屏幕共享生产者已关闭，剩余生产者数:', this.producers.size);
    }

    // 关闭摄像头生产者
    async closeCameraProducers() {
        console.log('=== 关闭摄像头生产者 ===');
        const cameraProducers = [];
        
        for (const [producerId, producer] of this.producers) {
            if (producer.appData?.type === 'camera' || producer.appData?.type === 'audio') {
                console.log('🔄 找到摄像头生产者:', {
                    id: producerId,
                    kind: producer.kind,
                    type: producer.appData?.type
                });
                cameraProducers.push(producerId);
            }
        }
        
        for (const producerId of cameraProducers) {
            const producer = this.producers.get(producerId);
            if (producer) {
                console.log('⏹️ 关闭生产者:', producerId);
                producer.close();
                this.producers.delete(producerId);
            }
        }
        
        console.log('✅ 摄像头生产者已关闭，剩余生产者数:', this.producers.size);
    }
}

export default MediaSoupClientService;

