import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ASSET_LINKS } from './common/assetlinks';
import { HealthResponseDto } from './common/dto/health-response.dto';
import { Public } from './modules/auth/decorators/public.decorator';

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

    @Public()
    @Get('.well-known/assetlinks.json')
    assetLinks() {
        return ASSET_LINKS;
    }
}
