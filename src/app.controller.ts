import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './modules/auth/decorators/public.decorator';
import { HealthResponseDto } from './common/dto/health-response.dto';

@ApiTags('health')
@Controller()
export class AppController {
    @Public()
    @Get('health')
    @ApiOperation({ summary: 'Health check' })
    @ApiOkResponse({ type: HealthResponseDto })
    health(): HealthResponseDto {
        return { status: 'ok' };
    }
}
