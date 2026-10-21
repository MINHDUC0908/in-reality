import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { UsersService } from '../../users/users.service.js';

// Khớp với payload đã ký trong AuthService.login()
export interface JwtPayload {
  sub: string;        // user ID
  email: string;
  sessionId?: string; // ID phiên đăng nhập hiện tại
  iat?: number;       // issued at (tự động thêm bởi jsonwebtoken)
  exp?: number;       // expiration (tự động thêm bởi jsonwebtoken)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    super({
      // Lấy token từ header: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Tự động từ chối token hết hạn
      ignoreExpiration: false,
      // Secret lấy từ .env — không bao giờ hard-code
      secretOrKey: config.get<string>('jwt.secret') as string,
    });
  }

  /**
   * Passport gọi validate() sau khi verify chữ ký JWT thành công.
   * Kiểm tra tính hợp lệ của phiên:
   * 1. Token cũ (không có sessionId) -> từ chối
   * 2. Đã bấm logout -> sessionId trong cache/DB là null -> từ chối
   * 3. Đã đăng nhập thiết bị khác -> sessionId không khớp -> từ chối
   */
  async validate(payload: JwtPayload) {
    if (!payload.sessionId) {
      throw new UnauthorizedException('Phiên đăng nhập cũ không còn hợp lệ, vui lòng đăng nhập lại');
    }

    // 1. Kiểm tra RAM Cache trước (siêu nhanh ~0.1ms, không gây tải DB)
    let activeSessionId = await this.cacheManager.get<string>(`user_session:${payload.sub}`);

    // 2. Nếu Cache miss (server restart hoặc cache bị đẩy ra), đọc lại từ DB
    let user = null;
    if (!activeSessionId) {
      user = await this.usersService.findById(payload.sub);
      if (!user || !user.currentSessionId) {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn hoặc bạn đã đăng xuất');
      }
      activeSessionId = user.currentSessionId;
      // Khôi phục lại RAM cache (24h)
      await this.cacheManager.set(`user_session:${payload.sub}`, activeSessionId, 24 * 60 * 60 * 1000);
    }

    // 3. So sánh sessionId: nếu khác nhau nghĩa là đã đăng xuất hoặc đăng nhập trên thiết bị mới
    if (activeSessionId !== payload.sessionId) {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã được đăng nhập trên một thiết bị khác. Vui lòng đăng nhập lại.',
      );
    }

    // Lấy thông tin user nếu chưa query ở trên
    if (!user) {
      user = await this.usersService.findById(payload.sub);
    }

    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị xóa');
    }

    // Trả về object này → Passport gắn vào req.user
    return { id: user.id, email: user.email, fullName: user.fullName };
  }
}
