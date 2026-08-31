import { Component, signal, computed, AfterViewChecked, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { ChatService, ChatDto, MessageDto, UserDto, CallDto, StatusDto } from '../../core/chat/chat.service';
import { SignalRService } from '../../core/signalr/signalr.service';
import { DevInfoComponent } from '../../shared/dev-info/dev-info.component';
import { environment } from '../../../environments/environment';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DevInfoComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewChecked, OnInit, OnDestroy {
  @ViewChild('messagesArea') messagesContainer!: ElementRef;
  @ViewChild('editMsgInput') editMsgInput!: ElementRef;
  @ViewChild('newChatInput') newChatInput!: ElementRef;

  activePanel = signal<'chats' | 'status' | 'groups' | 'calls' | 'settings'>('chats');
  searchQuery = signal('');
  selectedChatId = signal<number | null>(null);
  newMessage = signal('');
  showNewChatModal = signal(false);
  userSearchQuery = signal('');
  loading = signal(false);
  loadingUsers = signal(false);
  allUsers = signal<UserDto[]>([]);
  editingName = signal(false);
  editFirstName = signal('');
  editLastName = signal('');
  showUserInfo = signal(false);
  userInfoUser = signal<UserDto | null>(null);
  theme = signal<'system' | 'dark' | 'light'>('system');

  currentUser = signal<UserDto | null>(null);
  chats = signal<ChatDto[]>([]);
  messages = signal<MessageDto[]>([]);
  availableUsers = signal<UserDto[]>([]);

  isOtherUserTyping = signal(false);
  showContextMenu = signal(false);
  contextMenuX = signal(0);
  contextMenuY = signal(0);
  contextMenuMessage = signal<MessageDto | null>(null);
  replyingTo = signal<MessageDto | null>(null);
  editingMessage = signal<MessageDto | null>(null);
  editContent = signal('');
  showDeleted = signal(false);
  isRecording = signal(false);
  recordingTime = signal(0);
  showEmojiPicker = signal(false);
  playingVoiceId = signal<number | null>(null);
  voiceProgress = signal(0);
  voiceDuration = signal(0);
  previewFile = signal<{ name: string; url: string; type: string } | null>(null);
  errorMessage = signal('');
  statuses = signal<StatusDto[]>([]);
  showStatusModal = signal(false);
  statusText = signal('');
  statusPreview = signal<{ url: string; type: string } | null>(null);
  statusFile = signal<File | null>(null);
  showCallModal = signal(false);
  callType = signal<'voice' | 'video'>('voice');
  callDuration = signal(0);
  callState = signal<'outgoing' | 'ringing' | 'connected' | 'ended' | 'declined' | 'no-answer'>('ended');
  callTarget = signal('');
  activeCallId = signal<number | null>(null);
  incomingCall = signal<CallDto | null>(null);
  showIncomingCall = signal(false);
  isMuted = signal(false);
  isCameraOff = signal(false);
  isSpeakerOn = signal(true);
  callQuality = signal<'excellent' | 'good' | 'poor'>('excellent');
  callTargetUserId = signal<number | null>(null);
  callHistory = signal<CallDto[]>([]);
  showCreateGroupModal = signal(false);
  newGroupName = signal('');
  selectedGroupMembers = signal<number[]>([]);

  emojiGroups = [
    { label: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😚','😋','😛','😜','🤪','😝','🤗','🤭','🤔','😏','😒','🙄','😬','😌','😔','😪','😴','😷','🥴','😵','🤯','🤠','🥳','😎','🤓'] },
    { label: 'Gestures', emojis: ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','👋','🤚','🖐️','✋','👏','🙌','🤝','🙏','💪','🖕'] },
    { label: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'] },
    { label: 'Objects', emojis: ['🔥','⭐','🌟','💫','✨','💥','💯','🎉','🎊','🏆','🥇','🎵','🎶','📱','💻','📷','🎮','🎁','🎈','💡','🔑','📦'] },
  ];

  filteredChats = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.chats();
    return this.chats().filter(c =>
      c.otherUserName.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
    );
  });

  groupChats = computed(() => this.chats().filter(c => c.isGroup));
  selectedChat = computed(() => this.chats().find(c => c.id === this.selectedChatId()) ?? null);
  currentMessages = computed(() => this.messages());
  totalUnread = computed(() => this.chats().reduce((sum, c) => sum + c.unreadCount, 0));

  private refreshInterval: any;
  private msgRefreshInterval: any;
  private heartbeatInterval: any;
  private typingInterval: any;
  private callTimer: any = null;
  private callTimeout: any = null;
  private errorTimeout: any = null;
  private recordingTimer: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private audioProgressTimer: any = null;
  private ringtone: HTMLAudioElement | null = null;
  private outgoingRingtone: HTMLAudioElement | null = null;
  private ringtoneAudioCtx: AudioContext | null = null;
  private outgoingAudioCtx: AudioContext | null = null;
  private callEnded = false;
  private typingSendTimeout: any = null;
  private successTimeout: any = null;
  public successMessage = signal('');

  isDevMode = !environment.production;

  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalrSubscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private chatService: ChatService,
    private signalRService: SignalRService
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
    this.loadChats();
    this.refreshInterval = setInterval(() => this.loadChats(), 10000);
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 25000);
    this.sendHeartbeat();
    const saved = localStorage.getItem('flink-theme') as 'system' | 'dark' | 'light' | null;
    if (saved) this.theme.set(saved);
    this.applyTheme(this.theme());
    this.initSignalR();
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.msgRefreshInterval) clearInterval(this.msgRefreshInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.typingInterval) clearInterval(this.typingInterval);
    if (this.typingSendTimeout) clearTimeout(this.typingSendTimeout);
    if (this.successTimeout) clearTimeout(this.successTimeout);
    if (this.recordingTimer) clearInterval(this.recordingTimer);
    if (this.audioProgressTimer) clearInterval(this.audioProgressTimer);
    if (this.callTimer) clearInterval(this.callTimer);
    if (this.callTimeout) clearTimeout(this.callTimeout);
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.stopRingtones();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
    this.stopVoice();
    this.cleanupCall();
    this.signalrSubscriptions.forEach(s => s.unsubscribe());
    this.signalRService.stopConnection();
  }

  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  ngAfterViewChecked() {
    const count = this.messages().length;
    if (this.shouldAutoScroll && count > this.lastMessageCount) {
      this.scrollToBottom();
    }
    this.lastMessageCount = count;
  }

  // ── SignalR ─────────────────────────────────────────────────────────

  private initSignalR() {
    this.signalRService.startConnection();

    const sub1 = this.signalRService.onOfferReceived.subscribe(async (payload) => {
      if (!this.showCallModal()) {
        console.warn('Received WebRTC offer but no call modal open - ignoring');
        return;
      }
      await this.handleOffer(payload.callerId, payload.offer);
    });

    const sub2 = this.signalRService.onAnswerReceived.subscribe(async (payload) => {
      await this.handleAnswer(payload.answer);
    });

    const sub3 = this.signalRService.onIceCandidateReceived.subscribe(async (payload) => {
      await this.handleRemoteIceCandidate(payload.candidate);
    });

    const sub4 = this.signalRService.onCallSignalReceived.subscribe(async (payload) => {
      if (payload.signal === 'call-initiated') {
        if (this.showCallModal() && this.callState() === 'outgoing') return;
        const callerId = payload.callerId;
        const caller = await this.getUserById(callerId);
        this.callTargetUserId.set(callerId);
        this.incomingCall.set({
          id: payload.data?.callId || 0,
          chatId: 0,
          callerId: callerId,
          callerName: caller?.fullName || 'Unknown',
          receiverId: this.currentUser()?.id || 0,
          receiverName: '',
          callType: payload.data?.callType || 'voice',
          status: 'ringing',
          startedAt: new Date().toISOString()
        });
        this.callType.set((payload.data?.callType || 'voice') as 'voice' | 'video');
        this.callTarget.set(caller?.fullName || 'Unknown');
        this.showIncomingCall.set(true);
        this.playRingtone();
      } else if (payload.signal === 'call-accepted') {
        await this.handleCallAccepted();
      } else if (payload.signal === 'call-declined') {
        this.handleCallDeclined();
      } else if (payload.signal === 'call-ended') {
        this.handleRemoteCallEnded();
      } else if (payload.signal === 'call-type-update') {
        this.callType.set(payload.data?.callType || 'voice');
        if (payload.data?.callType === 'video') {
          await this.acquireCamera();
        }
      }
    });

    this.signalrSubscriptions.push(sub1, sub2, sub3, sub4);

    const sub5 = this.signalRService.onMessageReceived.subscribe((message) => {
      if (message.chatId === this.selectedChatId()) {
        if (this.addMessageIfMissing(message)) {
          if (this.selectedChatId()) this.signalRService.sendMarkAsRead(this.selectedChatId()!).catch(() => {});
        }
      }
      const isOwnMessage = message.senderId === this.currentUser()?.id;
      const isChatSelected = message.chatId === this.selectedChatId();
      this.chats.update(list => {
        const updated = list.map(c => c.id === message.chatId
          ? {
              ...c,
              lastMessage: message.content,
              lastMessageTime: message.sentAt,
              unreadCount: isOwnMessage || isChatSelected ? c.unreadCount : c.unreadCount + 1
            }
          : c);
        return updated.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      });
    });

    const sub6 = this.signalRService.onChatUpdated.subscribe((chat) => {
      this.chats.update(list => list.map(c => c.id === chat.id ? chat : c));
    });

    const sub7 = this.signalRService.onUserTyping.subscribe((payload) => {
      if (payload.chatId === this.selectedChatId() && payload.userId !== this.currentUser()?.id) {
        this.isOtherUserTyping.set(true);
      }
    });

    const sub8 = this.signalRService.onUserStopTyping.subscribe((payload) => {
      if (payload.chatId === this.selectedChatId()) {
        this.isOtherUserTyping.set(false);
      }
    });

    const sub9 = this.signalRService.onMessagesRead.subscribe((payload) => {
      if (payload.chatId === this.selectedChatId()) {
        this.messages.update(msgs => msgs.map(m => ({ ...m, isRead: true })));
      }
    });

    const sub10 = this.signalRService.onUserOnlineStatus.subscribe((payload) => {
      this.chats.update(list => list.map(c =>
        c.otherUserId === payload.userId ? { ...c, otherUserOnline: payload.isOnline } : c
      ));
    });

    this.signalrSubscriptions.push(sub5, sub6, sub7, sub8, sub9, sub10);
  }

  // ── WebRTC ──────────────────────────────────────────────────────────

  private createPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callTargetUserId()) {
        this.signalRService.sendIceCandidate(this.callTargetUserId()!, event.candidate.toJSON())
          .catch(err => console.warn('Failed to send ICE candidate:', err));
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0] || new MediaStream([event.track]);
      this.attachRemoteStream();
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if ((state === 'failed' || state === 'disconnected' || state === 'closed') && !this.callEnded) {
        this.endCall();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      if ((iceState === 'failed' || iceState === 'disconnected') && !this.callEnded) {
        this.endCall();
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }
  }

  private async acquireCamera(): Promise<void> {
    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: audioConstraints });
      this.localStream = stream;
      this.attachLocalStream();
      if (this.peerConnection) {
        stream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, stream);
        });
      }
    } catch (err) {
      console.error('Camera/microphone access denied:', err);
      this.showError('Camera/microphone access denied.');
    }
  }

  private async acquireMicrophone(): Promise<void> {
    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      this.localStream = stream;
      this.attachLocalStream();
      if (this.peerConnection) {
        stream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, stream);
        });
      }
    } catch (err) {
      console.error('Microphone access denied:', err);
      this.showError('Microphone access denied.');
    }
  }

  private attachLocalStream() {
    const tryAttach = (retries = 10) => {
      const videoEl = document.getElementById('localVideo') as HTMLVideoElement;
      if (videoEl && this.localStream) {
        videoEl.srcObject = this.localStream;
        videoEl.muted = true; // prevent local echo
        videoEl.play().catch(() => {});
      } else if (retries > 0) {
        setTimeout(() => tryAttach(retries - 1), 150);
      }
    };
    setTimeout(() => tryAttach(), 100);
  }

  private attachRemoteStream() {
    const tryAttach = (retries = 15) => {
      const videoEl = document.getElementById('remoteVideo') as HTMLVideoElement;
      const audioEl = document.getElementById('remoteAudio') as HTMLAudioElement;
      if (this.callType() === 'video' && videoEl && this.remoteStream) {
        videoEl.srcObject = this.remoteStream;
        videoEl.play().catch(() => {});
        // also attach audio track to audio element for redundancy
        if (audioEl) { audioEl.srcObject = this.remoteStream; }
      } else if (audioEl && this.remoteStream) {
        audioEl.srcObject = this.remoteStream;
        audioEl.play().catch(() => {});
      } else if (retries > 0) {
        setTimeout(() => tryAttach(retries - 1), 200);
      } else {
        console.warn('[WebRTC] Could not attach remote stream - no media element found');
      }
    };
    setTimeout(() => tryAttach(), 200);
  }

  private async handleOffer(callerId: number, offer: RTCSessionDescriptionInit): Promise<void> {
    this.createPeerConnection();
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    await this.signalRService.sendAnswer(callerId, answer);
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  private async handleRemoteIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private cleanupCall() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.callTimer) { clearInterval(this.callTimer); this.callTimer = null; }
    if (this.callTimeout) { clearTimeout(this.callTimeout); this.callTimeout = null; }
    this.remoteStream = null;
    this.callTargetUserId.set(null);
  }

  // ── Chat ────────────────────────────────────────────────────────────

  loadCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) { this.router.navigate(['/login']); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = parseInt(
        payload.nameid ||
        payload.sub ||
        payload.id ||
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
        '0'
      );
      this.currentUser.set({
        id: userId,
        firstName: payload.given_name || payload.firstName || 'User',
        lastName: payload.surname || payload.lastName || '',
        email: payload.email || '',
        username: payload.unique_name || payload.username || '',
        phoneNumber: payload.PhoneNumber || payload.phoneNumber || '',
        fullName: `${payload.given_name || payload.firstName || 'User'} ${payload.surname || payload.lastName || ''}`.trim()
      });
    } catch { this.router.navigate(['/login']); }
  }

  loadChats() {
    this.chatService.getChats().subscribe({
      next: (chats) => {
        const sorted = chats.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
        this.chats.set(sorted);
      },
      error: () => this.showError('Failed to load chats')
    });
  }

  loadCallHistory() {
    this.chatService.getCallHistory(50).subscribe({
      next: (calls) => this.callHistory.set(calls),
      error: () => this.showError('Failed to load call history')
    });
  }

  loadStatuses() {
    this.chatService.getStatuses().subscribe({
      next: (statuses) => this.statuses.set(statuses),
      error: () => this.showError('Failed to load statuses')
    });
  }

  setActivePanel(panel: 'chats' | 'status' | 'groups' | 'calls' | 'settings') {
    this.activePanel.set(panel);
    if (panel === 'calls') {
      this.loadCallHistory();
    }
    if (panel === 'status') {
      this.loadStatuses();
    }
  }

  selectChat(id: number) {
    if (this.selectedChatId() && this.selectedChatId() !== id) {
      this.signalRService.leaveChat(this.selectedChatId()!).catch(() => {});
    }
    this.selectedChatId.set(id);
    this.loading.set(true);
    this.messages.set([]);
    this.replyingTo.set(null);
    this.editingMessage.set(null);
    this.shouldAutoScroll = true;
    this.loadMessages(id);
    this.chatService.markAsRead(id).subscribe();
    this.joinSelectedChat(id);
  }

  private async joinSelectedChat(chatId: number): Promise<void> {
    try {
      await this.signalRService.startConnection();
      await this.signalRService.waitForConnection(5000);
      await this.signalRService.joinChat(chatId);
      await this.signalRService.sendMarkAsRead(chatId);
    } catch (err) {
      console.warn('Realtime chat join failed; HTTP chat still works:', err);
    }
  }

  loadMessages(chatId: number) {
    this.chatService.getMessages(chatId).subscribe({
      next: (msgs) => { this.messages.set(msgs); this.loading.set(false); },
      error: () => { this.loading.set(false); this.showError('Failed to load messages'); }
    });
  }

  checkTypingStatus(chatId: number) {
    this.chatService.getTypingStatus(chatId).subscribe({
      next: (res) => this.isOtherUserTyping.set(res.isTyping),
      error: () => this.isOtherUserTyping.set(false)
    });
  }

  sendHeartbeat() {
    this.chatService.sendHeartbeat().subscribe({ error: () => {} });
  }

  onMessageInput(value: string) {
    this.newMessage.set(value);
    if (this.selectedChatId() && value.length > 0) {
      this.signalRService.sendTyping(this.selectedChatId()!).catch(() => {});
      if (this.typingSendTimeout) clearTimeout(this.typingSendTimeout);
      this.typingSendTimeout = setTimeout(() => {
        if (this.selectedChatId()) {
          this.signalRService.sendStopTyping(this.selectedChatId()!).catch(() => {});
        }
      }, 3000);
    } else if (this.selectedChatId() && value.trim().length === 0) {
      if (this.typingSendTimeout) clearTimeout(this.typingSendTimeout);
      this.signalRService.sendStopTyping(this.selectedChatId()!).catch(() => {});
    }
  }

  openNewChatModal() {
    this.showNewChatModal.set(true);
    this.userSearchQuery.set('');
    this.loadingUsers.set(true);
    this.chatService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers.set(users);
        this.availableUsers.set(users);
        this.loadingUsers.set(false);
        setTimeout(() => this.newChatInput?.nativeElement?.focus(), 50);
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.loadingUsers.set(false);
      }
    });
  }

  closeNewChatModal() {
    this.showNewChatModal.set(false);
    this.userSearchQuery.set('');
  }

  filterUsers(query: string) {
    this.userSearchQuery.set(query);
    const q = query.toLowerCase().trim();
    if (!q) {
      this.availableUsers.set(this.allUsers());
      return;
    }
    const filtered = this.allUsers().filter(u =>
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      (u.phoneNumber && u.phoneNumber.toLowerCase().includes(q)) ||
      u.fullName.toLowerCase().includes(q)
    );
    this.availableUsers.set(filtered);
  }

  startNewChat(userId: number) {
    this.chatService.startChat(userId).subscribe({
      next: (chat) => {
        this.closeNewChatModal();
        this.loadChats();
        this.selectChat(chat.id);
      },
      error: (err) => {
        console.error('Failed to start chat:', err);
      }
    });
  }

  sendMessage() {
    const text = this.newMessage().trim();
    if (!text || !this.selectedChatId()) return;
    const chatId = this.selectedChatId()!;
    const replyTo = this.replyingTo()?.id;
    this.shouldAutoScroll = true;
    this.chatService.sendMessage({ chatId, content: text, replyToMessageId: replyTo }).subscribe({
      next: (msg) => {
        this.addMessageIfMissing(msg);
        this.newMessage.set('');
        this.replyingTo.set(null);
        this.signalRService.sendStopTyping(chatId).catch(() => {});
        this.updateChatPreview(chatId, text);
      },
      error: () => this.showError('Failed to send message')
    });
  }

  private addMessageIfMissing(message: MessageDto): boolean {
    if (this.messages().some(m => m.id === message.id)) return false;
    this.messages.update(msgs => [...msgs, message]);
    this.shouldAutoScroll = true;
    return true;
  }

  private updateChatPreview(chatId: number, lastMessage: string): void {
    this.chats.update(list => list.map(c =>
      c.id === chatId ? { ...c, lastMessage, lastMessageTime: new Date().toISOString() } : c
    ));
  }

  isCurrentUser(senderId: number): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.id === 0) return false;
    return user.id === senderId;
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }

  formatMessageTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDateSeparator(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  shouldShowDateSeparator(index: number): boolean {
    const msgs = this.messages();
    if (index === 0) return true;
    const prevDate = new Date(msgs[index - 1].sentAt).toDateString();
    const currDate = new Date(msgs[index].sentAt).toDateString();
    return prevDate !== currDate;
  }

  // ── Voice Recording ─────────────────────────────────────────────────

  async toggleRecording() {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : '';
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunks.length === 0) return;
        const blobType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: blobType });
        this.sendVoiceMessage(blob);
      };
      this.mediaRecorder.start(250);
      this.isRecording.set(true);
      this.recordingTime.set(0);
      this.recordingTimer = setInterval(() => this.recordingTime.update(t => t + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      this.showError('Microphone access denied. Please allow microphone permission.');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording.set(false);
    clearInterval(this.recordingTimer);
    this.recordingTime.set(0);
  }

  cancelRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.isRecording.set(false);
    clearInterval(this.recordingTimer);
    this.recordingTime.set(0);
  }

  formatRecordingTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  toggleVoice(event: Event, msg: MessageDto) {
    event.stopPropagation();
    if (!msg.content) return;
    if (this.playingVoiceId() === msg.id) {
      this.stopVoice();
    } else {
      this.playVoice(msg);
    }
  }

  playVoice(msg: MessageDto) {
    this.stopVoice();
    if (!msg.content) return;
    const audio = new Audio();
    this.currentAudio = audio;
    this.playingVoiceId.set(msg.id);
    audio.ontimeupdate = () => {
      this.voiceProgress.set(audio.currentTime);
      this.voiceDuration.set(audio.duration || 0);
    };
    audio.onended = () => {
      this.playingVoiceId.set(null);
      this.voiceProgress.set(0);
      this.voiceDuration.set(0);
      this.currentAudio = null;
    };
    audio.onerror = () => {
      this.playingVoiceId.set(null);
      this.voiceProgress.set(0);
      this.voiceDuration.set(0);
      this.currentAudio = null;
      this.showError('Failed to play voice message');
    };
    audio.src = msg.content;
    audio.play().catch(() => {
      this.playingVoiceId.set(null);
      this.currentAudio = null;
    });
  }

  stopVoice() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.playingVoiceId.set(null);
    this.voiceProgress.set(0);
    this.voiceDuration.set(0);
  }

  seekVoice(event: MouseEvent, msg: MessageDto) {
    if (this.playingVoiceId() !== msg.id || !this.currentAudio) return;
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const pct = (event.clientX - rect.left) / rect.width;
    this.currentAudio.currentTime = pct * (this.currentAudio.duration || 0);
  }

  getVoiceProgress(msg: MessageDto): number {
    if (this.playingVoiceId() !== msg.id || !this.voiceDuration()) return 0;
    return (this.voiceProgress() / this.voiceDuration()) * 100;
  }

  formatVoiceTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  previewAttachment(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.previewFile.set({
        name: file.name,
        url: reader.result as string,
        type: file.type
      });
    };
    reader.readAsDataURL(file);
  }

  sendPreviewFile() {
    const file = this.previewFile();
    if (!file || !this.selectedChatId()) { this.cancelPreview(); return; }
    const chatId = this.selectedChatId()!;
    const isImage = file.type.startsWith('image/');
    const isVoice = file.type.startsWith('audio/');
    const replyTo = this.replyingTo()?.id;
    this.shouldAutoScroll = true;

    const dataUrl = file.url;
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: mimeString });
    const fd = new FormData();
    fd.append('file', blob, file.name);

    this.chatService.uploadFile(fd).subscribe({
      next: (res) => {
        const msgType = isVoice ? 'voice' : (isImage ? 'image' : 'file');
        const displayContent = isVoice ? '🎤 Voice message' : (isImage ? '📷 Image' : '📎 ' + file.name);
        this.chatService.sendMessage({ chatId, content: res.fileUrl, messageType: msgType, replyToMessageId: replyTo }).subscribe({
          next: (msg) => {
            this.addMessageIfMissing(msg);
            this.replyingTo.set(null);
            this.cancelPreview();
            this.updateChatPreview(chatId, displayContent);
          },
          error: () => {
            this.cancelPreview();
            this.showError('Failed to send file');
          }
        });
      },
      error: () => { this.cancelPreview(); this.showError('Failed to upload file'); }
    });
  }

  cancelPreview() {
    this.previewFile.set(null);
  }

  insertEmoji(emoji: string) {
    this.newMessage.update(msg => msg + emoji);
  }

  toggleEmojiPicker() {
    this.showEmojiPicker.update(v => !v);
  }

  closeEmojiPicker() {
    this.showEmojiPicker.set(false);
  }

  sendVoiceMessage(blob: Blob) {
    if (!this.selectedChatId()) return;
    const chatId = this.selectedChatId()!;
    const replyTo = this.replyingTo()?.id;
    this.shouldAutoScroll = true;

    const fd = new FormData();
    const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
    fd.append('file', blob, `voice_${Date.now()}.${ext}`);

    this.chatService.uploadFile(fd).subscribe({
      next: (res) => {
        this.chatService.sendMessage({ chatId, content: res.fileUrl, messageType: 'voice', replyToMessageId: replyTo }).subscribe({
          next: (msg) => {
            this.addMessageIfMissing(msg);
            this.replyingTo.set(null);
            this.updateChatPreview(chatId, 'Voice message');
          },
          error: () => this.showError('Failed to send voice message')
        });
      },
      error: () => { this.showError('Failed to upload voice message'); }
    });
  }

  scrollToBottom() {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  onMessagesScroll() {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (!el) return;
      const threshold = 150;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      this.shouldAutoScroll = atBottom;
    } catch {}
  }

  getInitials(name: string): string {
    if (!name || !name.trim()) return '?';
    return name.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  logout() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.msgRefreshInterval) clearInterval(this.msgRefreshInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.typingInterval) clearInterval(this.typingInterval);
    if (this.typingSendTimeout) clearTimeout(this.typingSendTimeout);
    if (this.successTimeout) clearTimeout(this.successTimeout);
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  goBack() {
    const chatId = this.selectedChatId();
    if (chatId) {
      this.signalRService.leaveChat(chatId).catch(() => {});
    }
    this.selectedChatId.set(null);
    this.isOtherUserTyping.set(false);
  }

  startEditName() {
    const user = this.currentUser();
    this.editFirstName.set(user?.firstName || '');
    this.editLastName.set(user?.lastName || '');
    this.editingName.set(true);
  }

  cancelEditName() {
    this.editingName.set(false);
  }

  saveName() {
    const first = this.editFirstName().trim();
    const last = this.editLastName().trim();
    if (!first) return;
    this.chatService.updateProfile(first, last).subscribe({
      next: (res) => {
        if (res.success && res.token) {
          localStorage.setItem('token', res.token);
          this.loadCurrentUser();
        }
        this.editingName.set(false);
      },
      error: (err) => console.error('Failed to update profile:', err)
    });
  }

  openUserInfo(userId: number) {
    this.chatService.getUserInfo(userId).subscribe({
      next: (user) => {
        this.userInfoUser.set(user);
        this.showUserInfo.set(true);
      },
      error: (err) => console.error('Failed to load user info:', err)
    });
  }

  openUserInfoFromHeader() {
    const chat = this.selectedChat();
    if (chat) this.openUserInfo(chat.otherUserId);
  }

  openUserInfoFromChatItem(event: MouseEvent, chat: ChatDto) {
    event.preventDefault();
    if (chat.isGroup) return;
    this.openUserInfo(chat.otherUserId);
  }

  closeUserInfo() {
    this.showUserInfo.set(false);
    this.userInfoUser.set(null);
  }

  setTheme(mode: 'system' | 'dark' | 'light') {
    this.theme.set(mode);
    localStorage.setItem('flink-theme', mode);
    this.applyTheme(mode);
  }

  private applyTheme(mode: 'system' | 'dark' | 'light') {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(mode);
    }
  }

  showError(message: string) {
    this.errorMessage.set(message);
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => this.errorMessage.set(''), 4000);
  }

  showSuccess(message: string) {
    this.successMessage.set(message);
    if (this.successTimeout) clearTimeout(this.successTimeout);
    this.successTimeout = setTimeout(() => this.successMessage.set(''), 4000);
  }

  showComingSoon(feature: string) {
    this.showError(`${feature} - Coming Soon`);
  }

  formatCallTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  formatCallDurationFromTimes(answeredAt: string, endedAt: string): string {
    const start = new Date(answeredAt);
    const end = new Date(endedAt);
    const diffMs = end.getTime() - start.getTime();
    const secs = Math.floor(diffMs / 1000);
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  }

  openCreateGroupModal() {
    this.showCreateGroupModal.set(true);
    this.newGroupName.set('');
    this.selectedGroupMembers.set([]);
    this.loadAllUsers();
  }

  closeCreateGroupModal() {
    this.showCreateGroupModal.set(false);
    this.newGroupName.set('');
    this.selectedGroupMembers.set([]);
  }

  toggleGroupMember(userId: number) {
    const current = this.selectedGroupMembers();
    if (current.includes(userId)) {
      this.selectedGroupMembers.set(current.filter(id => id !== userId));
    } else {
      this.selectedGroupMembers.set([...current, userId]);
    }
  }

  createGroupChat() {
    const name = this.newGroupName().trim();
    const memberIds = this.selectedGroupMembers();
    if (!name || memberIds.length === 0) {
      this.showError('Please enter a group name and select at least one member');
      return;
    }
    this.chatService.createGroupChat(name, memberIds).subscribe({
      next: (chat) => {
        this.loadChats();
        this.closeCreateGroupModal();
        this.showSuccess('Group created successfully!');
      },
      error: () => this.showError('Failed to create group')
    });
  }

  loadAllUsers() {
    this.chatService.getAllUsers().subscribe({
      next: (users) => this.allUsers.set(users),
      error: () => this.showError('Failed to load users')
    });
  }

  openContextMenu(event: MouseEvent, msg: MessageDto) {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuMessage.set(msg);
    const menuWidth = 190;
    const menuHeight = 200;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight);
    this.contextMenuX.set(x);
    this.contextMenuY.set(y);
    this.showContextMenu.set(true);
  }

  closeContextMenu() {
    this.showContextMenu.set(false);
    this.contextMenuMessage.set(null);
  }

  replyToMessage() {
    const msg = this.contextMenuMessage();
    if (msg) {
      this.replyingTo.set(msg);
      this.closeContextMenu();
    }
  }

  copyMessage() {
    const msg = this.contextMenuMessage();
    if (msg) {
      navigator.clipboard.writeText(msg.content).catch(() => {});
      this.closeContextMenu();
    }
  }

  editMessageAction() {
    const msg = this.contextMenuMessage();
    if (msg && this.isCurrentUser(msg.senderId) && !msg.isDeleted) {
      this.editingMessage.set(msg);
      this.editContent.set(msg.content);
      this.closeContextMenu();
      setTimeout(() => this.editMsgInput?.nativeElement?.focus(), 50);
    }
  }

  saveEditMessage() {
    const msg = this.editingMessage();
    const content = this.editContent().trim();
    if (!msg || !content) return;
    this.chatService.editMessage({ messageId: msg.id, content }).subscribe({
      next: (updated) => {
        this.messages.update(msgs => msgs.map(m => m.id === updated.id ? updated : m));
        this.editingMessage.set(null);
        this.editContent.set('');
      },
      error: () => {}
    });
  }

  cancelEditMessage() {
    this.editingMessage.set(null);
    this.editContent.set('');
  }

  deleteMessageAction() {
    const msg = this.contextMenuMessage();
    if (msg && this.isCurrentUser(msg.senderId)) {
      this.chatService.deleteMessage(msg.id).subscribe({
        next: () => {
          this.messages.update(msgs => msgs.map(m =>
            m.id === msg.id ? { ...m, isDeleted: true, content: '' } : m
          ));
          this.closeContextMenu();
        },
        error: () => {}
      });
    }
  }

  cancelReply() {
    this.replyingTo.set(null);
  }

  openStatusModal() {
    this.showStatusModal.set(true);
    this.statusText.set('');
    this.statusPreview.set(null);
  }

  closeStatusModal() {
    this.showStatusModal.set(false);
    this.statusText.set('');
    this.statusPreview.set(null);
    this.statusFile.set(null);
  }

  previewStatusImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.statusFile.set(file);
    const reader = new FileReader();
    reader.onload = () => {
      this.statusPreview.set({ url: reader.result as string, type: file.type });
    };
    reader.readAsDataURL(file);
  }

  postStatus() {
    const text = this.statusText().trim();
    const file = this.statusFile();
    if (!text && !file) return;
    
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      
      this.chatService.uploadFile(formData).subscribe({
        next: (response) => {
          this.chatService.createStatus(text || undefined, response.fileUrl).subscribe({
            next: (status) => {
              this.statuses.update(list => [status, ...list]);
              this.closeStatusModal();
              this.showSuccess('Status posted successfully!');
            },
            error: () => this.showError('Failed to create status')
          });
        },
        error: () => this.showError('Failed to upload image')
      });
    } else {
      this.chatService.createStatus(text).subscribe({
        next: (status) => {
          this.statuses.update(list => [status, ...list]);
          this.closeStatusModal();
          this.showSuccess('Status posted successfully!');
        },
        error: () => this.showError('Failed to create status')
      });
    }
  }

  // ── Calling (WebRTC + SignalR) ──────────────────────────────────────

  async startCall(type: 'voice' | 'video') {
    const chat = this.selectedChat();
    if (!chat) return;
    this.callEnded = false;
    this.callType.set(type);
    this.callTarget.set(chat.otherUserName);
    this.callTargetUserId.set(chat.otherUserId);
    this.callState.set('outgoing');
    this.callDuration.set(0);
    this.showCallModal.set(true);
    this.playOutgoingRingtone();

    if (type === 'video') {
      await this.acquireCamera();
    } else {
      await this.acquireMicrophone();
    }

    try {
      await this.signalRService.waitForConnection(5000);
    } catch {
      this.showError('Connection not ready. Retrying...');
      this.signalRService.startConnection();
      try {
        await this.signalRService.waitForConnection(5000);
      } catch {
        this.showError('Cannot connect to server.');
        this.cleanupCall();
        this.closeCallModal();
        return;
      }
    }

    this.chatService.initiateCall(chat.id, type).subscribe({
      next: async (call) => {
        this.activeCallId.set(call.id);
        try {
          await this.signalRService.sendCallSignal(chat.otherUserId, 'call-initiated', { callId: call.id, callType: type });
        } catch (err) {
          console.error('Failed to send call-initiated signal:', err);
          this.showError('Failed to notify caller. Retrying...');
          try {
            await this.signalRService.sendCallSignal(chat.otherUserId, 'call-initiated', { callId: call.id, callType: type });
          } catch {
            this.showError('Could not connect to user.');
            this.cleanupCall();
            this.closeCallModal();
            return;
          }
        }
        this.callTimeout = setTimeout(() => {
          if (this.callState() === 'outgoing') {
            this.callState.set('no-answer');
            this.chatService.declineCall(call.id).subscribe();
            this.signalRService.sendCallSignal(chat.otherUserId, 'call-declined')
              .catch(() => {});
            this.stopRingtones();
            this.cleanupCall();
            setTimeout(() => this.closeCallModal(), 2000);
          }
        }, 30000);
      },
      error: () => {
        this.showError('Failed to start call');
        this.cleanupCall();
        this.closeCallModal();
      }
    });
  }

  async acceptIncomingCall() {
    const call = this.incomingCall();
    if (!call) return;
    this.callEnded = false;
    this.stopRingtones();
    this.showIncomingCall.set(false);
    this.incomingCall.set(null);
    this.activeCallId.set(call.id);
    this.callType.set(call.callType as 'voice' | 'video');
    this.callTarget.set(call.callerName);
    this.callTargetUserId.set(call.callerId);
    this.callDuration.set(0);
    this.showCallModal.set(true);
    this.callState.set('ringing');

    if (call.callType === 'video') {
      await this.acquireCamera();
    } else {
      await this.acquireMicrophone();
    }

    this.chatService.acceptCall(call.id).subscribe({
      next: async () => {
        this.callState.set('connected');
        this.callTimer = setInterval(() => this.callDuration.update(d => d + 1), 1000);
        try {
          await this.signalRService.sendCallSignal(call.callerId, 'call-accepted');
        } catch (err) {
          console.error('Failed to send call-accepted:', err);
        }
      },
      error: () => this.showError('Failed to accept call')
    });
  }

  declineIncomingCall() {
    const call = this.incomingCall();
    if (!call) return;
    this.stopRingtones();
    this.signalRService.sendCallSignal(call.callerId, 'call-declined');
    this.chatService.declineCall(call.id).subscribe();
    this.showIncomingCall.set(false);
    this.incomingCall.set(null);
    this.cleanupCall();
  }

  async handleCallAccepted() {
    this.stopRingtones();
    this.callState.set('connected');
    this.callDuration.set(0);
    if (this.callTimer) clearInterval(this.callTimer);
    this.callTimer = setInterval(() => this.callDuration.update(d => d + 1), 1000);

    this.createPeerConnection();
    if (this.peerConnection) {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      if (this.callTargetUserId()) {
        await this.signalRService.sendOffer(this.callTargetUserId()!, offer);
      }
    }
  }

  handleCallDeclined() {
    this.stopRingtones();
    this.callState.set('declined');
    this.cleanupCall();
    setTimeout(() => this.closeCallModal(), 2000);
  }

  handleRemoteCallEnded() {
    this.stopRingtones();
    this.callState.set('ended');
    if (this.callTimer) { clearInterval(this.callTimer); this.callTimer = null; }
    if (this.callTimeout) { clearTimeout(this.callTimeout); this.callTimeout = null; }
    this.cleanupCall();
    setTimeout(() => this.closeCallModal(), 1000);
  }

  endCall() {
    if (this.callEnded) return;
    this.callEnded = true;
    const callId = this.activeCallId();
    const targetUserId = this.callTargetUserId();
    this.callState.set('ended');
    this.stopRingtones();

    if (this.callTimer) { clearInterval(this.callTimer); this.callTimer = null; }
    if (this.callTimeout) { clearTimeout(this.callTimeout); this.callTimeout = null; }

    if (callId) {
      this.chatService.endCall(callId).subscribe();
    }
    if (targetUserId) {
      this.signalRService.sendCallSignal(targetUserId, 'call-ended');
    }
    this.cleanupCall();
    setTimeout(() => this.closeCallModal(), 1000);
  }

  closeCallModal() {
    this.showCallModal.set(false);
    this.callDuration.set(0);
    this.callState.set('ended');
    this.activeCallId.set(null);
    this.isMuted.set(false);
    this.isCameraOff.set(false);
    this.isSpeakerOn.set(true);
    this.callQuality.set('excellent');
    this.stopRingtones();
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted.set(!audioTrack.enabled);
      }
    } else {
      this.isMuted.update(v => !v);
    }
  }

  toggleCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.isCameraOff.set(!videoTrack.enabled);
      }
    }
  }

  async toggleSpeaker() {
    this.isSpeakerOn.update(v => !v);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
      if (audioOutputs.length > 1) {
        const currentSpeaker = localStorage.getItem('flink-speaker') || 'default';
        const nextIndex = (audioOutputs.findIndex(d => d.deviceId === currentSpeaker) + 1) % audioOutputs.length;
        const nextSpeaker = audioOutputs[nextIndex].deviceId;
        localStorage.setItem('flink-speaker', nextSpeaker);
        const audioEl = document.getElementById('remoteAudio') as HTMLAudioElement;
        if (audioEl && 'setSinkId' in audioEl) {
          await (audioEl as any).setSinkId(nextSpeaker);
        }
      }
    } catch (err) {
      console.error('Speaker toggle failed:', err);
    }
  }

  playRingtone() {
    this.stopRingtones();
    try {
      this.ringtoneAudioCtx = new AudioContext();
      const playRing = () => {
        if (!this.ringtoneAudioCtx) return;
        const osc1 = this.ringtoneAudioCtx.createOscillator();
        const osc2 = this.ringtoneAudioCtx.createOscillator();
        const gain = this.ringtoneAudioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.value = 440;
        osc2.type = 'sine';
        osc2.frequency.value = 480;
        gain.gain.value = 0.3;
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ringtoneAudioCtx.destination);
        osc1.start();
        osc2.start();
        setTimeout(() => { osc1.stop(); osc2.stop(); }, 2000);
      };
      playRing();
      this.ringtone = { pause: () => {}, play: () => Promise.resolve() } as any;
      (this as any)._ringtoneInterval = setInterval(playRing, 3000);
    } catch {}
  }

  playOutgoingRingtone() {
    this.stopRingtones();
    try {
      this.outgoingAudioCtx = new AudioContext();
      const playRing = () => {
        if (!this.outgoingAudioCtx) return;
        const osc = this.outgoingAudioCtx.createOscillator();
        const gain = this.outgoingAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 425;
        gain.gain.value = 0.2;
        osc.connect(gain);
        gain.connect(this.outgoingAudioCtx.destination);
        osc.start();
        setTimeout(() => osc.stop(), 1000);
      };
      playRing();
      this.outgoingRingtone = { pause: () => {}, play: () => Promise.resolve() } as any;
      (this as any)._outgoingInterval = setInterval(playRing, 2000);
    } catch {}
  }

  stopRingtones() {
    if ((this as any)._ringtoneInterval) { clearInterval((this as any)._ringtoneInterval); (this as any)._ringtoneInterval = null; }
    if ((this as any)._outgoingInterval) { clearInterval((this as any)._outgoingInterval); (this as any)._outgoingInterval = null; }
    if (this.ringtoneAudioCtx) { this.ringtoneAudioCtx.close(); this.ringtoneAudioCtx = null; }
    if (this.outgoingAudioCtx) { this.outgoingAudioCtx.close(); this.outgoingAudioCtx = null; }
    if (this.ringtone) { this.ringtone = null; }
    if (this.outgoingRingtone) { this.outgoingRingtone = null; }
  }

  formatCallDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private async getUserById(userId: number): Promise<UserDto | null> {
    try {
      const users = this.allUsers();
      const found = users.find(u => u.id === userId);
      if (found) return found;
      return await firstValueFrom(this.chatService.getUserInfo(userId));
    } catch {
      return null;
    }
  }

}
