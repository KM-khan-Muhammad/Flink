import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber?: string;
  fullName: string;
}

export interface ChatDto {
  id: number;
  name?: string;
  isGroup: boolean;
  otherUserId: number;
  otherUserName: string;
  otherUserEmail?: string;
  otherUserOnline?: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface MessageDto {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  content: string;
  messageType: string;
  isRead: boolean;
  isDeleted: boolean;
  replyToMessageId?: number;
  replyToMessageContent?: string;
  replyToMessageSenderName?: string;
  sentAt: string;
  editedAt?: string;
}

export interface SendMessageRequest {
  chatId: number;
  content: string;
  messageType?: string;
  replyToMessageId?: number;
}

export interface EditMessageRequest {
  messageId: number;
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'https://localhost:7030/api';

  constructor(private http: HttpClient) {}

  getChats(): Observable<ChatDto[]> {
    return this.http.get<ChatDto[]>(`${this.apiUrl}/chat`);
  }

  getChat(chatId: number): Observable<ChatDto> {
    return this.http.get<ChatDto>(`${this.apiUrl}/chat/${chatId}`);
  }

  startChat(otherUserId: number): Observable<ChatDto> {
    return this.http.post<ChatDto>(`${this.apiUrl}/chat/start`, { otherUserId });
  }

  getMessages(chatId: number, page: number = 1): Observable<MessageDto[]> {
    return this.http.get<MessageDto[]>(`${this.apiUrl}/chat/${chatId}/messages?page=${page}`);
  }

  sendMessage(request: SendMessageRequest): Observable<MessageDto> {
    return this.http.post<MessageDto>(`${this.apiUrl}/chat/send`, request);
  }

  markAsRead(chatId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/chat/${chatId}/read`, {});
  }

  editMessage(request: EditMessageRequest): Observable<MessageDto> {
    return this.http.put<MessageDto>(`${this.apiUrl}/chat/edit`, request);
  }

  deleteMessage(messageId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/chat/${messageId}`);
  }

  sendHeartbeat(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/chat/heartbeat`, {});
  }

  sendTyping(chatId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/chat/typing`, { chatId });
  }

  getTypingStatus(chatId: number): Observable<{ isTyping: boolean }> {
    return this.http.get<{ isTyping: boolean }>(`${this.apiUrl}/chat/${chatId}/typing`);
  }

  searchUsers(query: string): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.apiUrl}/chat/users/search?q=${query}`);
  }

  getAllUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.apiUrl}/chat/users`);
  }

  updateProfile(firstName: string, lastName: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/update-profile`, { firstName, lastName });
  }

  getUserInfo(userId: number): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.apiUrl}/chat/users/${userId}`);
  }
}
