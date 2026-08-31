import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { MessageDto, ChatDto } from '../chat/chat.service';

export interface OfferPayload {
  callerId: number;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerPayload {
  callerId: number;
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  callerId: number;
  candidate: RTCIceCandidateInit;
}

export interface CallSignalPayload {
  callerId: number;
  signal: string;
  data?: any;
}

export interface TypingPayload {
  chatId: number;
  userId: number;
}

export interface OnlineStatusPayload {
  userId: number;
  isOnline: boolean;
}

export interface MessagesReadPayload {
  chatId: number;
  userId: number;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private callHub: signalR.HubConnection | null = null;
  private chatHub: signalR.HubConnection | null = null;
  private callHubUrl = environment.hubUrl || (environment.apiUrl.replace('/api', '') + '/hubs/call');
  private chatHubUrl = environment.apiUrl.replace('/api', '') + '/hubs/chat';

  private offerReceived$ = new Subject<OfferPayload>();
  private answerReceived$ = new Subject<AnswerPayload>();
  private iceCandidateReceived$ = new Subject<IceCandidatePayload>();
  private callSignalReceived$ = new Subject<CallSignalPayload>();
  private connectionEstablished$ = new Subject<void>();
  private connectionClosed$ = new Subject<void>();

  private messageReceived$ = new Subject<MessageDto>();
  private chatUpdated$ = new Subject<ChatDto>();
  private userTyping$ = new Subject<TypingPayload>();
  private userStopTyping$ = new Subject<TypingPayload>();
  private messagesRead$ = new Subject<MessagesReadPayload>();
  private userOnlineStatus$ = new Subject<OnlineStatusPayload>();

  get onOfferReceived(): Observable<OfferPayload> { return this.offerReceived$.asObservable(); }
  get onAnswerReceived(): Observable<AnswerPayload> { return this.answerReceived$.asObservable(); }
  get onIceCandidateReceived(): Observable<IceCandidatePayload> { return this.iceCandidateReceived$.asObservable(); }
  get onCallSignalReceived(): Observable<CallSignalPayload> { return this.callSignalReceived$.asObservable(); }
  get onConnectionEstablished(): Observable<void> { return this.connectionEstablished$.asObservable(); }
  get onConnectionClosed(): Observable<void> { return this.connectionClosed$.asObservable(); }
  get onMessageReceived(): Observable<MessageDto> { return this.messageReceived$.asObservable(); }
  get onChatUpdated(): Observable<ChatDto> { return this.chatUpdated$.asObservable(); }
  get onUserTyping(): Observable<TypingPayload> { return this.userTyping$.asObservable(); }
  get onUserStopTyping(): Observable<TypingPayload> { return this.userStopTyping$.asObservable(); }
  get onMessagesRead(): Observable<MessagesReadPayload> { return this.messagesRead$.asObservable(); }
  get onUserOnlineStatus(): Observable<OnlineStatusPayload> { return this.userOnlineStatus$.asObservable(); }

  get connectionState(): signalR.HubConnectionState | null {
    return this.callHub?.state ?? null;
  }

  get isConnected(): boolean {
    return this.callHub?.state === signalR.HubConnectionState.Connected
        && this.chatHub?.state === signalR.HubConnectionState.Connected;
  }

  waitForConnection(timeoutMs: number = 5000): Promise<void> {
    if (this.isConnected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('SignalR connection timeout')), timeoutMs);
      const sub = this.connectionEstablished$.subscribe(() => {
        clearTimeout(timeout);
        sub.unsubscribe();
        resolve();
      });
    });
  }

  constructor(private zone: NgZone) {}

  async startConnection(): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (this.callHub && this.callHub.state === signalR.HubConnectionState.Connected
        && this.chatHub && this.chatHub.state === signalR.HubConnectionState.Connected) {
      return;
    }

    await Promise.all([
      this.startCallHub(),
      this.startChatHub()
    ]);
    this.connectionEstablished$.next();
  }

  private async startCallHub(): Promise<void> {
    if (this.callHub && this.callHub.state === signalR.HubConnectionState.Connected) return;

    this.callHub = new signalR.HubConnectionBuilder()
      .withUrl(this.callHubUrl, {
        accessTokenFactory: () => localStorage.getItem('token') || '',
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.elapsedMilliseconds < 30000) {
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 10000);
          }
          return null;
        }
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.callHub.on('ReceiveOffer', (payload: OfferPayload) => {
      this.zone.run(() => this.offerReceived$.next(payload));
    });
    this.callHub.on('ReceiveAnswer', (payload: AnswerPayload) => {
      this.zone.run(() => this.answerReceived$.next(payload));
    });
    this.callHub.on('ReceiveIceCandidate', (payload: IceCandidatePayload) => {
      this.zone.run(() => this.iceCandidateReceived$.next(payload));
    });
    this.callHub.on('ReceiveCallSignal', (payload: CallSignalPayload) => {
      this.zone.run(() => this.callSignalReceived$.next(payload));
    });

    this.callHub.onreconnected(() => {
      this.zone.run(() => this.connectionEstablished$.next());
    });
    this.callHub.onclose(() => {
      this.zone.run(() => this.connectionClosed$.next());
    });

    try {
      await this.callHub.start();
    } catch (err) {
      console.error('CallHub connection error:', err);
      setTimeout(() => this.startCallHub(), 5000);
    }
  }

  private async startChatHub(): Promise<void> {
    if (this.chatHub && this.chatHub.state === signalR.HubConnectionState.Connected) return;

    this.chatHub = new signalR.HubConnectionBuilder()
      .withUrl(this.chatHubUrl, {
        accessTokenFactory: () => localStorage.getItem('token') || '',
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.elapsedMilliseconds < 30000) {
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 10000);
          }
          return null;
        }
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.chatHub.on('ReceiveMessage', (message: MessageDto) => {
      this.zone.run(() => this.messageReceived$.next(message));
    });
    this.chatHub.on('ReceiveChatUpdate', (chat: ChatDto) => {
      this.zone.run(() => this.chatUpdated$.next(chat));
    });
    this.chatHub.on('UserTyping', (payload: TypingPayload) => {
      this.zone.run(() => this.userTyping$.next(payload));
    });
    this.chatHub.on('UserStopTyping', (payload: TypingPayload) => {
      this.zone.run(() => this.userStopTyping$.next(payload));
    });
    this.chatHub.on('MessagesRead', (payload: MessagesReadPayload) => {
      this.zone.run(() => this.messagesRead$.next(payload));
    });
    this.chatHub.on('UserOnlineStatus', (payload: OnlineStatusPayload) => {
      this.zone.run(() => this.userOnlineStatus$.next(payload));
    });

    this.chatHub.onreconnected(() => {
      this.zone.run(() => this.connectionEstablished$.next());
    });
    this.chatHub.onclose(() => {
      this.zone.run(() => this.connectionClosed$.next());
    });

    try {
      await this.chatHub.start();
    } catch (err) {
      console.error('ChatHub connection error:', err);
      setTimeout(() => this.startChatHub(), 5000);
    }
  }

  async stopConnection(): Promise<void> {
    if (this.callHub) {
      await this.callHub.stop();
      this.callHub = null;
    }
    if (this.chatHub) {
      await this.chatHub.stop();
      this.chatHub = null;
    }
  }

  // CallHub methods
  async sendOffer(targetUserId: number, offer: RTCSessionDescriptionInit): Promise<void> {
    if (this.callHub?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR not connected');
    }
    await this.callHub.invoke('SendOffer', targetUserId, offer);
  }

  async sendAnswer(targetUserId: number, answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.callHub?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR not connected');
    }
    await this.callHub.invoke('SendAnswer', targetUserId, answer);
  }

  async sendIceCandidate(targetUserId: number, candidate: RTCIceCandidateInit): Promise<void> {
    if (this.callHub?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR not connected');
    }
    await this.callHub.invoke('SendIceCandidate', targetUserId, candidate);
  }

  async sendCallSignal(targetUserId: number, signal: string, data?: any): Promise<void> {
    if (this.callHub?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR not connected');
    }
    await this.callHub.invoke('SendCallSignal', targetUserId, signal, data);
  }

  // ChatHub methods
  async joinChat(chatId: number): Promise<void> {
    if (this.chatHub?.state !== signalR.HubConnectionState.Connected) return;
    await this.chatHub.invoke('JoinChat', chatId);
  }

  async leaveChat(chatId: number): Promise<void> {
    if (this.chatHub?.state !== signalR.HubConnectionState.Connected) return;
    await this.chatHub.invoke('LeaveChat', chatId);
  }

  async sendChatMessage(chatId: number, content: string, messageType: string = 'text', replyToMessageId?: number): Promise<void> {
    if (this.chatHub?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('ChatHub not connected');
    }
    await this.chatHub.invoke('SendMessage', chatId, content, messageType, replyToMessageId);
  }

  async sendTyping(chatId: number): Promise<void> {
    if (this.chatHub?.state !== signalR.HubConnectionState.Connected) return;
    await this.chatHub.invoke('Typing', chatId);
  }

  async sendStopTyping(chatId: number): Promise<void> {
    if (this.chatHub?.state !== signalR.HubConnectionState.Connected) return;
    await this.chatHub.invoke('StopTyping', chatId);
  }

  async sendMarkAsRead(chatId: number): Promise<void> {
    if (this.chatHub?.state !== signalR.HubConnectionState.Connected) return;
    await this.chatHub.invoke('MarkAsRead', chatId);
  }
}
