/* eslint-disable no-console */
import * as vscode from 'vscode';
import dirTree from 'directory-tree';
import SwaggerParser from '@apidevtools/swagger-parser';
import YAML from 'yaml';
import { getAllConfiguration, getConfiguration, getGlobalState, setConfiguration } from '../utils/vscodeUtil';
import { getConfigJSONPath, getServiceMapPath, getTSwaggerConfigJSON } from '../utils/swaggerUtil';
import { getLocalTranslation } from '../utils/localTranslate';
import { existsSync, outputFileSync, readFileSync } from 'fs-extra';
import { ServiceMapInfoYAMLJSONType, TSwaggerConfig } from '../types';
import { join } from 'path';

/**
 * 查询插件配置信息
 * @param context vscode.ExtensionContext
 * @returns {setting: any, config: any, globalState: any}
 */
export async function queryExtInfo(context: vscode.ExtensionContext) {
  // 获取所有配置信息
  const allSetting = getAllConfiguration(['swaggerUrlList', 'groupSwaggerDocList', 'translation']);
  // 获取全局状态
  const globalState = getGlobalState(context);
  // 获取插件配置
  const config = getTSwaggerConfigJSON();
  
  // 兼容旧数据：如果 groupSwaggerDocList 不存在，初始化为空数组
  if (!allSetting.groupSwaggerDocList) {
    allSetting.groupSwaggerDocList = [];
  }
  
  // 返回配置信息
  return {
    setting: allSetting,
    config,
    globalState,
  };
}

/**
 * 查询本地翻译缓存
 * @returns {Promise<any>} 返回本地翻译缓存结果
 */
export async function queryLocalTranslation() {
  return getLocalTranslation();
}

/**
 * 更新翻译配置
 * @param data - 翻译配置数据
 */
export async function updateTranslationConfig(data: any) {
  setConfiguration('translation', data);
}

/**
 * 查询当前工作区的目录树
 * @returns {Promise<dirTree.DirectoryTree[]>} 目录树列表
 */
export async function queryCwd() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const treeList: dirTree.DirectoryTree[] = [];

  // 获取工作区文件夹列表
  if (!!workspaceFolders?.length) {
    workspaceFolders.forEach((workspaceFolder) => {
      // 构建目录树
      treeList.push(
        dirTree(workspaceFolder.uri.fsPath, {
          attributes: ['type', 'size'],
          exclude: [/node_modules/, /.git/],
          extensions: /\.(ts|tsx)$/,
        }),
      );
    });
  }

  return treeList;
}

/**
 * 检查 config.json 配置文件是否存在
 */
export async function checkConfigJSON() {
  const configJSONPath = getConfigJSONPath();

  if (!configJSONPath) {
    return null;
  }

  return existsSync(configJSONPath);
}

/**
 * 保存配置JSON文件
 * @param configJSON 配置JSON对象
 * @returns 返回保存是否成功
 */
export async function saveConfigJSON(configJSON: TSwaggerConfig) {
  const configJSONPath = getConfigJSONPath();
  if (!configJSONPath) {
    return null;
  }

  /**
   * 输出文件内容到文件
   * @param filePath 文件路径
   * @param content 文件内容
   * @param options 文件选项
   */
  outputFileSync(configJSONPath, JSON.stringify(configJSON, null, 2), { encoding: 'utf-8' });

  return true;
}

/**
 * 读取对应分组下的 service.map.yaml 文件信息
 * @param params - 参数对象
 * @param params.mappedBasePath - 映射的基本路径
 * @param params.groupNameList - 组名列表
 * @returns 服务映射信息数组
 */
export async function readLocalServiceInfoByGroup(params: {
  mappedBasePath: string;
  groupNameList: string[];
}): Promise<ServiceMapInfoYAMLJSONType[]> {
  const { mappedBasePath, groupNameList } = params;
  // 基本路径
  const baseTargetPath = getServiceMapPath(mappedBasePath);

  if (!baseTargetPath) {
    return [];
  }

  const result: ServiceMapInfoYAMLJSONType[] = [];
  groupNameList.forEach((groupName) => {
    const serviceMapPath = join(baseTargetPath, groupName, 'service.map.yaml');
    if (!existsSync(serviceMapPath)) {
      return;
    }
    const serviceMapYaml = readFileSync(serviceMapPath, { encoding: 'utf-8' });
    const serviceMapJSON = YAML.parse(serviceMapYaml);
    result.push(serviceMapJSON);
  });

  return result;
}

/**
 * 解析Swagger文档地址并返回API响应
 * @param remoteUrl - Swagger URL
 * @returns API响应
 */
export async function parseSwaggerUrl(remoteUrl: string) {
  // 解析Swagger URL
  const apiResponse = await SwaggerParser.parse(remoteUrl);
  // 输出API名称和版本
  console.info('API name: %s, Version: %s', apiResponse.info.title, apiResponse.info.version);
  // 返回API响应
  return apiResponse;
}

/**
 * 解析Swagger JSON字符串
 * @param swaggerJsonStr Swagger JSON字符串
 * @returns 解析后的API响应
 */
export async function parseSwaggerJson(swaggerJsonStr: string) {
  // 解析Swagger JSON字符串
  const apiResponse = await SwaggerParser.parse(JSON.parse(swaggerJsonStr));
  return apiResponse;
}

/**
 * 添加swaggerUrl到配置中
 * @param data 要添加的swaggerUrl
 * @returns 添加后的swaggerUrl列表
 */
export async function addSwaggerUrl(data: any) {
  // 获取swaggerUrlList配置
  const swaggerUrlList = getConfiguration('swaggerUrlList');
  // 将data添加到swaggerUrlList中
  swaggerUrlList.push(data);
  // 设置新的swaggerUrlList配置
  setConfiguration('swaggerUrlList', swaggerUrlList);
  // 返回添加后的swaggerUrl列表
  return swaggerUrlList;
}

/**
 * 删除swaggerUrl
 * @param data 要删除的swaggerUrl对象
 */
export async function delSwaggerUrl(data: any) {
  // 获取swaggerUrlList配置
  const swaggerUrlList = getConfiguration('swaggerUrlList');
  // 过滤掉要删除的swaggerUrl对象
  const newSwaggerUrlList = swaggerUrlList.filter((it: any) => it.key !== data.key && it.url !== data.url);
  // 更新swaggerUrlList配置
  setConfiguration('swaggerUrlList', newSwaggerUrlList);
  // 返回新的swaggerUrlList配置
  return newSwaggerUrlList;
}

/**
 * 更新swaggerUrl
 * @param {any} data - 要更新的数据
 * @returns {any} - 更新后的数据列表
 */
export async function updateSwaggerUrl(data: any) {
  const swaggerUrlList = getConfiguration('swaggerUrlList');
  const targetIndex = swaggerUrlList.findIndex((it: any) => it.key === data.key);

  // 如果找到了目标索引
  if (targetIndex > -1) {
    swaggerUrlList[targetIndex] = data;
    setConfiguration('swaggerUrlList', swaggerUrlList);
    return swaggerUrlList;
  }

  return null;
}

/**
 * 全量更新 swagger 文档接口地址列表
 * @param {any[]} list - 要更新的列表数据
 * @returns {any[]} - 更新后的列表数据
 */
export async function updateSwaggerUrlList(list: any[]) {
  setConfiguration('swaggerUrlList', list);
  return list;
}

// ==================== 分组文档相关接口 ====================

/**
 * 添加分组文档
 */
export async function addGroupSwaggerDoc(data: any) {
  const groupSwaggerDocList = getConfiguration('groupSwaggerDocList') || [];
  
  // 只有当 groupId 存在时才处理分组逻辑
  if (data.groupId) {
    // 查找或创建分组
    let targetGroup = groupSwaggerDocList.find((group: any) => group.id === data.groupId);
    if (!targetGroup) {
      targetGroup = {
        id: data.groupId,
        name: data.groupName || '未命名分组',
        docs: []
      };
      groupSwaggerDocList.push(targetGroup);
    }
    
    // 添加文档到分组
    targetGroup.docs.push(data);
    
    setConfiguration('groupSwaggerDocList', groupSwaggerDocList);
  }
  // 没有 groupId 的文档不需要特殊处理，由前端管理未分组数据
  
  return groupSwaggerDocList;
}

/**
 * 删除分组文档
 */
export async function delGroupSwaggerDoc(data: any) {
  const groupSwaggerDocList = getConfiguration('groupSwaggerDocList') || [];
  
  // 只有当 groupId 存在时才处理分组逻辑
  if (data.groupId) {
    // 查找分组
    const targetGroup = groupSwaggerDocList.find((group: any) => group.id === data.groupId);
    if (targetGroup) {
      // 从分组中删除文档
      targetGroup.docs = targetGroup.docs.filter((doc: any) => doc.key !== data.key && doc.url !== data.url);
      
      // 如果分组为空，删除分组
      if (targetGroup.docs.length === 0) {
        const groupIndex = groupSwaggerDocList.findIndex((group: any) => group.id === data.groupId);
        if (groupIndex > -1) {
          groupSwaggerDocList.splice(groupIndex, 1);
        }
      }
    }
    
    setConfiguration('groupSwaggerDocList', groupSwaggerDocList);
  }
  // 没有 groupId 的文档不需要特殊处理，由前端管理未分组数据
  
  return groupSwaggerDocList;
}

/**
 * 更新分组文档
 */
export async function updateGroupSwaggerDoc(data: any) {
  const groupSwaggerDocList = getConfiguration('groupSwaggerDocList') || [];
  
  // 只有当 groupId 存在时才处理分组逻辑
  if (data.groupId) {
    // 查找分组
    const targetGroup = groupSwaggerDocList.find((group: any) => group.id === data.groupId);
    if (targetGroup) {
      // 查找并更新文档
      const docIndex = targetGroup.docs.findIndex((doc: any) => doc.key === data.key);
      if (docIndex > -1) {
        targetGroup.docs[docIndex] = data;
        setConfiguration('groupSwaggerDocList', groupSwaggerDocList);
        return groupSwaggerDocList;
      }
    }
  }
  // 没有 groupId 的文档不需要特殊处理，由前端管理未分组数据
  
  return groupSwaggerDocList;
}

/**
 * 更新分组信息
 */
export async function updateSwaggerDocGroup(data: any) {
  const groupSwaggerDocList = getConfiguration('groupSwaggerDocList') || [];
  
  // 查找并更新分组
  const groupIndex = groupSwaggerDocList.findIndex((group: any) => group.id === data.id);
  if (groupIndex > -1) {
    groupSwaggerDocList[groupIndex] = { ...groupSwaggerDocList[groupIndex], ...data };
    setConfiguration('groupSwaggerDocList', groupSwaggerDocList);
    return groupSwaggerDocList;
  }
  
  return null;
}

/**
 * 全量更新分组文档列表
 */
export async function updateGroupSwaggerDocList(list: any[]) {
  setConfiguration('groupSwaggerDocList', list);
  return list;
}

/**
 * 创建新分组
 */
export async function createSwaggerDocGroup(data: any) {
  const groupSwaggerDocList = getConfiguration('groupSwaggerDocList') || [];
  
  const newGroup = {
    id: data.id || `group_${Date.now()}`,
    name: data.name || '新分组',
    docs: []
  };
  
  groupSwaggerDocList.push(newGroup);
  setConfiguration('groupSwaggerDocList', groupSwaggerDocList);
  return groupSwaggerDocList;
}

/**
 * 删除分组
 */
export async function deleteSwaggerDocGroup(groupId: string) {
  const groupSwaggerDocList = getConfiguration('groupSwaggerDocList') || [];
  
  const newList = groupSwaggerDocList.filter((group: any) => group.id !== groupId);
  setConfiguration('groupSwaggerDocList', newList);
  return newList;
}

/**
 * 写入 ts 文件
 */
export async function writeTsFile(params: { tsDef: string; outputPath: string }) {
  const { tsDef, outputPath } = params;

  outputFileSync(outputPath, tsDef, { encoding: 'utf-8' });

  return true;
}
