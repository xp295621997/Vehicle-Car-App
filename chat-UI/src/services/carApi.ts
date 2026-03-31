// 车辆控制 API 服务
// 接口地址: http://preview.tsp-mock.sc.iccc.mioffice.cn/test/dds-noauth

// 车辆配置
const CAR_CONFIG = {
  vid: 'HXMQRBURENLJNU7E7',
  userId: '2421894891',
};

// 命令类型定义
export interface CarCommand {
  vid: string;
  cmdId: number;
  domain: string;
  device: string;
  param: string;
  value: string;
  userId: string;
}

export interface CarCommandResponse {
  code: number;
  msg?: string;
  data?: any;
}

// 发送车辆控制命令
export async function sendCarCommand(cmdId: number, domain: string, param: string, value: string): Promise<CarCommandResponse> {
  const command: CarCommand = {
    vid: CAR_CONFIG.vid,
    cmdId,
    domain,
    device: '',
    param,
    value,
    userId: CAR_CONFIG.userId,
  };

  try {
    const response = await fetch('/api/car-control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[Car API] 响应:', JSON.stringify(result));

    // 检查业务层面的响应码
    if (result.data && result.data.respCode && result.data.respCode !== '00000') {
      throw new Error(`API错误: ${result.data.respMsg || result.data.respCode}`);
    }

    return result;
  } catch (error) {
    console.error('[Car API] 请求失败:', error);
    throw error;
  }
}

// 预定义的车辆控制命令
export const CAR_COMMANDS = {
  // 车身控制
  HOOD_OPEN: { cmdId: 33, domain: 'Hood', param: 'open', value: '2' },        // 打开前备箱
  HOOD_CLOSE: { cmdId: 34, domain: 'Hood', param: 'close', value: '2' },     // 关闭前备箱

  TRUNK_OPEN: { cmdId: 35, domain: 'Trunk', param: 'open', value: '2' },    // 打开后备箱
  TRUNK_CLOSE: { cmdId: 36, domain: 'Trunk', param: 'close', value: '2' },  // 关闭后备箱

  DOOR_UNLOCK: { cmdId: 37, domain: 'Door', param: 'unlock', value: '0' },  // 解锁
  DOOR_LOCK: { cmdId: 38, domain: 'Door', param: 'lock', value: '0' },      // 锁车

  WINDOW_OPEN: { cmdId: 39, domain: 'Window', param: 'open', value: '0' },   // 开窗
  WINDOW_CLOSE: { cmdId: 40, domain: 'Window', param: 'close', value: '0' }, // 关窗

  // 空调控制
  AC_ON: { cmdId: 41, domain: 'AC', param: 'on', value: '0' },              // 开空调
  AC_OFF: { cmdId: 42, domain: 'AC', param: 'off', value: '0' },            // 关空调
  AC_SET_TEMP: { cmdId: 43, domain: 'AC', param: 'temperature', value: '22' }, // 设置温度

  // 灯光控制
  LIGHT_FLASH: { cmdId: 44, domain: 'Light', param: 'flash', value: '1' },  // 闪灯
  HORN_HONK: { cmdId: 45, domain: 'Horn', param: 'honk', value: '1' },     // 鸣笛

  // 充电控制
  CHARGE_PORT_OPEN: { cmdId: 46, domain: 'ChargePort', param: 'open', value: '0' }, // 打开充电口
  CHARGE_PORT_CLOSE: { cmdId: 47, domain: 'ChargePort', param: 'close', value: '0' }, // 关闭充电口

  // 座椅控制
  SEAT_HEATING_ON: { cmdId: 48, domain: 'SeatHeating', param: 'on', value: '1' },   // 座椅加热开
  SEAT_HEATING_OFF: { cmdId: 49, domain: 'SeatHeating', param: 'off', value: '0' },  // 座椅加热关

  SEAT_VENTILATION_ON: { cmdId: 50, domain: 'SeatVentilation', param: 'on', value: '1' },   // 座椅通风开
  SEAT_VENTILATION_OFF: { cmdId: 51, domain: 'SeatVentilation', param: 'off', value: '0' },  // 座椅通风关

  // 哨兵模式
  SENTRY_MODE_ON: { cmdId: 52, domain: 'SentryMode', param: 'on', value: '0' },   // 开启哨兵
  SENTRY_MODE_OFF: { cmdId: 53, domain: 'SentryMode', param: 'off', value: '0' },  // 关闭哨兵

  // 方向盘加热
  STEERING_HEAT_ON: { cmdId: 54, domain: 'SteeringHeat', param: 'on', value: '0' },   // 方向盘加热开
  STEERING_HEAT_OFF: { cmdId: 55, domain: 'SteeringHeat', param: 'off', value: '0' },  // 方向盘加热关

  // 备车功能
  PREPARE_CAR: { cmdId: 56, domain: 'PrepareCar', param: 'start', value: '0' }, // 一键备车

  // 驾驶模式
  MODE_SPORT: { cmdId: 57, domain: 'DriveMode', param: 'sport', value: '0' },     // 运动模式
  MODE_COMFORT: { cmdId: 58, domain: 'DriveMode', param: 'comfort', value: '0' }, // 舒适模式
  MODE_ECO: { cmdId: 59, domain: 'DriveMode', param: 'eco', value: '0' },        // 节能模式
};

// 快捷调用函数
export const carActions = {
  openHood: () => sendCarCommand(33, 'Hood', 'open', '2'),
  closeHood: () => sendCarCommand(32, 'Hood', 'lock', '1'),
  openTrunk: () => sendCarCommand(35, 'Trunk', 'open', '2'),
  closeTrunk: () => sendCarCommand(36, 'Trunk', 'close', '2'),
  unlock: () => sendCarCommand(37, 'Door', 'unlock', '0'),
  lock: () => sendCarCommand(38, 'Door', 'lock', '0'),
  flashLights: () => sendCarCommand(44, 'Light', 'flash', '1'),
  honk: () => sendCarCommand(45, 'Horn', 'honk', '1'),
  openChargePort: () => sendCarCommand(46, 'ChargePort', 'open', '0'),
  closeChargePort: () => sendCarCommand(47, 'ChargePort', 'close', '0'),
  sentryOn: () => sendCarCommand(52, 'SentryMode', 'on', '0'),
  sentryOff: () => sendCarCommand(53, 'SentryMode', 'off', '0'),
  prepareCar: () => sendCarCommand(56, 'PrepareCar', 'start', '0'),
  setDriveMode: (mode: 'sport' | 'comfort' | 'eco') => {
    const modeMap = { sport: 57, comfort: 58, eco: 59 };
    return sendCarCommand(modeMap[mode], 'DriveMode', mode, '0');
  },
  // 空调控制
  turnOnAC: () => sendCarCommand(512, 'Hvac', 'HVACOnOff', '2'),
  turnOffAC: () => sendCarCommand(512, 'Hvac', 'HVACOnOff', '1'),
  // 车锁控制
  lockCar: () => sendCarCommand(1537, 'CenterLock', 'state', '1'),
  unlockCar: () => sendCarCommand(1537, 'CenterLock', 'state', '2'),
};
